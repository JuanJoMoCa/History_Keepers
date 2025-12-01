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
<<<<<<< HEAD
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    if (usuario.password !== password) return res.status(401).json({ message: "Contraseña incorrecta." });
=======
    if (!usuario) {
      
      return res.status(404).json({
        success: false,
        message: "Este correo no está asociado a ninguna cuenta."
      });
    }
    
    
    if (usuario.password !== password) {
      
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectos."
      });
    }

    
>>>>>>> 8fbed82b4efa294dc22386ea174ede28f2f2989f
    if (!SKIP_EMAIL_VERIFICATION && usuario.rol === 'usuario comprador' && !usuario.isVerified) {
      return res.status(403).json({ message: "Verifica tu correo primero." });
    }
<<<<<<< HEAD
=======
    
    
>>>>>>> 8fbed82b4efa294dc22386ea174ede28f2f2989f
    res.json({
      success: true, message: `¡Bienvenido!`,
      user: { _id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

<<<<<<< HEAD
=======


// --- Verificación de correo  ---
>>>>>>> 8fbed82b4efa294dc22386ea174ede28f2f2989f
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
    
    // MODIFICACIÓN: Agregamos búsqueda exacta por barcode
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { barcode: search } // <--- ESTO ES LO NUEVO
      ];
    }
<<<<<<< HEAD
    const items = await Product.find(query).skip((page - 1) * limit).limit(Number(limit)).sort({ createdAt: -1 });
=======
    
    const items = await Product.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });
>>>>>>> 8fbed82b4efa294dc22386ea174ede28f2f2989f
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

<<<<<<< HEAD
=======
// --- 4. ACTUALIZAR PRODUCTO (PUT) - NUEVO ---
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // Aquí Express ya lee todo lo que mandemos, incluido 'status'
    
    const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
    
    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    
    res.json(updatedProduct);
  } catch (error) {
    console.error("Error actualizando:", error);
    res.status(500).json({ message: "Error al actualizar el producto" });
  }
});

// 4. ELIMINAR (DELETE) - (Sin cambios)
>>>>>>> 8fbed82b4efa294dc22386ea174ede28f2f2989f
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

<<<<<<< HEAD
// ================================================================
// API DE PEDIDOS Y POS (CORREGIDO Y UNIFICADO)
// ================================================================
=======
// --- API DE PEDIDOS (Sin cambios) ---
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('products.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerDetails, products, subtotal, shippingCost, total, tipoVenta, status } = req.body;
    
    // 1. VALIDACIÓN DE STOCK
    const productIds = products.map(p => p.product);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    
    // Verificamos disponibilidad
    const unavailableProduct = dbProducts.find(p => p.status !== 'Disponible');
    if (unavailableProduct) {
      return res.status(409).json({ 
        success: false,
        message: `El artículo "${unavailableProduct.name}" ya no está disponible.`
      });
    }

    const orderNumber = `HK-${Date.now().toString().slice(5)}`;
    
    // 2. DETERMINAR ESTATUS DEL PRODUCTO
    // Si es venta física ('Vendido'), el producto se marca vendido ya. Si es online, 'Pendiente'.
    const initialStatus = status || 'Pagado'; // Si no envían status, asumimos Pagado (Online)
    const newProductStatus = (initialStatus === 'Vendido') ? 'Vendido' : 'Pendiente de envío';

    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { status: newProductStatus } }
    );
    
    const newOrder = new Order({
      orderNumber,
      customerDetails,
      products,
      subtotal,
      shippingCost,
      total,
      tipoVenta,
      status: initialStatus
    });
    
    await newOrder.save();
    res.status(201).json(newOrder);

  } catch (error) {
    console.error("Error al crear orden:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    // IMPORTANTE: No usamos populate aquí para tener los IDs puros
    const order = await Order.findById(id); 
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    
    // Extraer IDs de productos correctamente
    const productIds = order.products.map(p => p.product);

    if (status === 'Cancelado') {
      // LIBERAR PRODUCTOS
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { status: 'Disponible' } }
      );
    }
    
    if (status === 'Entregado' || status === 'Vendido') {
       // MARCAR COMO VENDIDOS
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { status: 'Vendido' } }
      );
    }

    await order.save();
    res.json(order);
  } catch (error) {
    console.error("Error actualizando orden:", error);
    res.status(500).json({ message: error.message });
  }
});

// --- API DE VENTAS (Sin cambios) ---
app.get('/api/sales/summary', async (req, res) => {
  try {
    const salesByMonth = await Order.aggregate([
      { $match: { status: { $in: ['Entregado', 'Vendido'] } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalSales: { $sum: "$total" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);
    
    const salesByType = await Order.aggregate([
      { $match: { status: { $in: ['Entregado', 'Vendido'] } } },
      {
        $group: {
          _id: "$tipoVenta",
          totalSales: { $sum: "$total" }
        }
      }
    ]);
    
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ salesByMonth, salesByType, ordersByStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- API DE GESTIÓN DE EMPLEADOS (Sin cambios) ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({ 
      rol: { $nin: ['usuario comprador', 'administrador'] }
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    
    const validRoles = ['usuario comprador', 'trabajador', 'gerente']; // 'administrador' quitado
    if (!nombre || !email || !password || !validRoles.includes(rol)) {
      return res.status(400).json({ message: 'Campos obligatorios o rol no válido.' });
    }

    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Este correo ya está registrado.' });
    }
    
    const nuevoUsuario = new User({ nombre, email, password, rol });
    await nuevoUsuario.save();
    
    const userResponse = nuevoUsuario.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    const validRoles = ['usuario comprador', 'trabajador', 'gerente']; // 'administrador' quitado
    if (!validRoles.includes(rol)) {
      return res.status(400).json({ message: 'Rol no válido.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { rol: rol } },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    
    res.json({ success: true, message: 'Usuario eliminado.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
>>>>>>> 8fbed82b4efa294dc22386ea174ede28f2f2989f

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