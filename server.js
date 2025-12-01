// ================================================================
// SERVER.JS - VERSIÓN LIMPIA (MONGOOSE)
// ================================================================
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Importar Modelos
const Product = require('./models/product.model.js');
const Order = require('./models/order.model.js');
const User = require('./models/user.model.js');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';

// Middlewares
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// --- Configuración Cloudinary ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'HistoryKeepersProducts', allowed_formats: ['jpg', 'png', 'webp'] }
});
const upload = multer({ storage: storage });

// --- Configuración Nodemailer ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

// Función auxiliar de correo
async function sendVerificationEmail(user) {
  if (!user.verificationToken) return;
  const confirmUrl = `${BASE_URL}/auth/verify-email?token=${user.verificationToken}&action=confirm`;
  const rejectUrl  = `${BASE_URL}/auth/verify-email?token=${user.verificationToken}&action=reject`;
  const firstName = user.nombre.split(' ')[0];

  await transporter.sendMail({
    from: `"History Keepers" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Verifica tu cuenta en History Keepers',
    html: `
      <div style="font-family: Arial; padding: 20px; border: 1px solid #eee;">
        <h2>Hola, ${firstName}</h2>
        <p>Activa tu cuenta:</p>
        <p><a href="${confirmUrl}" style="background:#000;color:#fff;padding:10px;">Verificar correo</a></p>
        <p><a href="${rejectUrl}" style="color:red;">No reconozco esto</a></p>
      </div>`
  });
}

// ================================================================
// RUTAS DE AUTENTICACIÓN
// ================================================================
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!email || !password || !nombre) return res.status(400).json({ message: "Faltan campos." });
    
    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ message: "Correo ya registrado." });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const nuevoUsuario = new User({
      nombre, email, password, rol: 'usuario comprador',
      isVerified: SKIP_EMAIL_VERIFICATION,
      verificationToken: SKIP_EMAIL_VERIFICATION ? undefined : verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000
    });

    await nuevoUsuario.save();
    if (!SKIP_EMAIL_VERIFICATION) await sendVerificationEmail(nuevoUsuario);
    
    res.status(201).json({ success: true, message: "Registro exitoso." });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    if (usuario.password !== password) return res.status(401).json({ message: "Contraseña incorrecta." });
    if (!SKIP_EMAIL_VERIFICATION && usuario.rol === 'usuario comprador' && !usuario.isVerified) {
      return res.status(403).json({ message: "Verifica tu correo primero." });
    }
    res.json({
      success: true, message: `¡Bienvenido!`,
      user: { _id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/auth/verify-email', async (req, res) => {
  try {
    const { token, action } = req.query;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).send('Enlace inválido');

    if (action === 'reject') {
      await User.deleteOne({ _id: user._id });
      return res.send('Registro cancelado');
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.redirect('/index.html');
  } catch (error) { res.status(500).send('Error'); }
});

// ================================================================
// API DE PRODUCTOS
// ================================================================
app.get('/api/products', async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { barcode: search }
      ];
    }
    const items = await Product.find(query).skip((page - 1) * limit).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await Product.countDocuments(query);
    res.json({ items, total });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'No encontrado' });
    res.json(product);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/products', upload.array('images', 5), async (req, res) => {
  try {
    const data = req.body;
    data.barcode = Date.now().toString().slice(3) + Math.floor(1000 + Math.random() * 9000);
    data.status = 'Disponible';
    if (req.files) data.images = req.files.map(f => f.path);
    
    const newProduct = new Product(data);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
  try {
    const updateData = req.body;
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'No encontrado' });

    let images = existing.images || [];
    if (req.files && req.files.length > 0) {
      images = images.concat(req.files.map(f => f.path));
    }
    updateData.images = images;

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/products/:id/image', async (req, res) => {
  try {
    const { imagePath } = req.body;
    await Product.findByIdAndUpdate(req.params.id, { $pull: { images: imagePath } });
    const publicId = imagePath.split('/').slice(-2).join('/').split('.')[0];
    cloudinary.uploader.destroy(publicId, () => {});
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ================================================================
// API DE PEDIDOS Y POS (CORREGIDO Y UNIFICADO)
// ================================================================

// 1. Buscar Usuario (POS)
app.get('/api/users/lookup', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Falta email" });

    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } 
    });

    if (user) {
      res.json({ found: true, _id: user._id, name: user.nombre, email: user.email });
    } else {
      res.json({ found: false });
    }
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 2. Crear Orden (POS y Web)
app.post('/api/orders', async (req, res) => {
  try {
    const { 
      orderNumber, customerDetails, products, subtotal, shippingCost, total, 
      tipoVenta, status, trackingNumber 
    } = req.body;
    
    const productIds = products.map(p => p.product);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    
    if (tipoVenta !== 'Física') {
        const unavailable = dbProducts.find(p => p.status !== 'Disponible');
        if (unavailable) {
            return res.status(409).json({ success: false, message: `No disponible: ${unavailable.name}` });
        }
    }

    const newProdStatus = (tipoVenta === 'Física') ? 'Vendido' : 'Pendiente de envío';
    await Product.updateMany({ _id: { $in: productIds } }, { $set: { status: newProdStatus } });

    const newOrder = new Order({
      orderNumber: orderNumber || `HK-${Date.now().toString().slice(5)}`,
      customerDetails,
      products,
      subtotal, shippingCost, total, tipoVenta,
      status: status || 'Pagado',
      trackingNumber: trackingNumber || ''
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) { 
    console.error("Error creating order:", error);
    res.status(500).json({ message: error.message }); 
  }
});

// 3. Listar Ordenes
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('products.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 4. Actualizar Orden
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'No encontrado' });

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    
    await order.save();
    res.json(order);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 5. Mis Pedidos
app.get('/api/my-orders/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    
    const orders = await Order.find({ 'customerDetails.email': user.email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ================================================================
// API ADMIN / PERFIL
// ================================================================

// --- RUTA DE ESTADÍSTICAS (DASHBOARD) ---
app.get('/api/sales/summary', async (req, res) => {
  try {
    // 1. Traemos TODAS las órdenes completadas
    // Usamos .lean() para que sean objetos JS simples y rápidos
    const orders = await Order.find({
      status: { $in: ['Entregado', 'Vendido'] }
    }).lean();

    // 2. Calcular Ventas por Mes (Lógica manual en JS)
    const salesByMonthMap = {};
    
    orders.forEach(o => {
      // Si no tiene fecha o es inválida, usamos la fecha de hoy para no romper la gráfica
      let d = o.createdAt ? new Date(o.createdAt) : new Date();
      if (isNaN(d.getTime())) d = new Date(); 

      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month}`; // Ej: "2025-12"
      
      if (!salesByMonthMap[key]) {
        salesByMonthMap[key] = {
          _id: { year, month },
          totalSales: 0
        };
      }
      salesByMonthMap[key].totalSales += (Number(o.total) || 0);
    });
    
    const salesByMonth = Object.values(salesByMonthMap);

    // 3. Calcular Ventas por Tipo
    const salesByTypeMap = {};
    orders.forEach(o => {
      const type = o.tipoVenta || "No especificado";
      if (!salesByTypeMap[type]) {
        salesByTypeMap[type] = { _id: type, totalSales: 0 };
      }
      salesByTypeMap[type].totalSales += (Number(o.total) || 0);
    });
    const salesByType = Object.values(salesByTypeMap);

    // 4. Contar Estatus
    const allOrders = await Order.find({}, 'status').lean();
    const statusMap = {};
    allOrders.forEach(o => {
      const s = o.status || "Sin estatus";
      if (!statusMap[s]) statusMap[s] = { _id: s, count: 0 };
      statusMap[s].count++;
    });
    const ordersByStatus = Object.values(statusMap);

    // Enviar respuesta
    res.json({ salesByMonth, salesByType, ordersByStatus });

  } catch (error) {
    console.error("Error Calculando Dashboard:", error);
    // En caso de error, enviamos arrays vacíos para que no salga el mensaje rojo en el front
    res.json({ salesByMonth: [], salesByType: [], ordersByStatus: [] });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({ rol: { $nin: ['usuario comprador', 'administrador'] } }).select('-password');
    res.json(users);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    res.json(user);
  } catch (error) { res.status(500).json({message: error.message}); }
});

app.put('/api/profile/:id', async (req, res) => {
  try {
    const { nombre, email, telefono } = req.body;
    await User.findByIdAndUpdate(req.params.id, { nombre, email, telefono });
    res.json({ success: true });
  } catch (error) { res.status(500).json({message: error.message}); }
});

// ================================================================
// INICIO
// ================================================================
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Base de datos conectada`);
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
  } catch (error) { console.error("❌ Error DB:", error); }
}
startServer();