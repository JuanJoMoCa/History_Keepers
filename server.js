// --- 1. Cargar variables de entorno (del .env) ---
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// --- 2. Importar Cloudinary ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Importar TODOS los modelos
const Product = require('./models/product.model.js');
const Order = require('./models/order.model.js');
const ReturnTicket = require('./models/return.model.js');
const User = require('./models/user.model.js');

const app = express();
const PORT = 3000;

const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// --- Transporter de Nodemailer  ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  tls: {
    
    rejectUnauthorized: false
  }
});

// Opcional, para ver si arranca bien:
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ Error configurando Nodemailer:', err);
  } else {
    console.log('📧 Servidor de correo listo');
  }
});


// --- Conexión a MongoDB (con Mongoose) ---
const MONGO_URI = "mongodb+srv://Salinas_user:rutabus123@rutabus.qdwcba8.mongodb.net/history_keepers_db?retryWrites=true&w=majority&appName=Rutabus";

// --- 3. Configurar Cloudinary ---
// (Lee las claves de tu archivo .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- 4. Configurar Multer para que suba a Cloudinary ---
// (Reemplaza tu 'fileStorage' local)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'HistoryKeepersProducts', // Nombre de la carpeta en Cloudinary
    allowed_formats: ['jpg', 'png', 'webp']
  }
});
const upload = multer({ storage: storage }); // 'upload' ahora usa Cloudinary


// Middlewares
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
// Ya no necesitamos servir 'assets/uploads', Cloudinary lo hace
app.use('/assets', express.static(path.join(__dirname, 'assets')));

async function sendVerificationEmail(user) {
  if (!user.verificationToken) return;

  const confirmUrl = `${BASE_URL}/auth/verify-email?token=${user.verificationToken}&action=confirm`;
  const rejectUrl  = `${BASE_URL}/auth/verify-email?token=${user.verificationToken}&action=reject`;

  const firstName = user.nombre.split(' ')[0];

  const mailOptions = {
    from: `"History Keepers" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Verifica tu cuenta en History Keepers',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee;">
        <h2>Hola, ${firstName} </h2>
        <p>Comieza a coleccionar y gracias por registrarte en <strong>History Keepers</strong>.</p>
        <p>Por seguridad, necesitamos que confirmes que este correo realmente te pertenece.</p>

        <p style="margin-top: 20px;">Da clic en el siguiente botón para <strong>activar tu cuenta de comprador</strong>:</p>

        <p style="text-align: center; margin: 24px 0;">
          <a href="${confirmUrl}"
             style="background:#000;color:#fff;padding:12px 20px;text-decoration:none;font-weight:bold;text-transform:uppercase;border-radius:4px;">
            Verificar correo
          </a>
        </p>

        <hr style="margin: 24px 0;"/>

        <p style="font-size: 0.9rem; color: #555;">
          Si tú <strong>no</strong> iniciaste este registro, puedes cancelar todo haciendo clic aquí:
        </p>
        <p style="text-align: center; margin: 16px 0;">
          <a href="${rejectUrl}"
             style="color:#b00020;font-weight:bold;">
            No reconozco este registro
          </a>
        </p>

        <p style="font-size: 0.8rem; color: #999; margin-top: 24px;">
          Este enlace es válido por 24 horas. Si expira, podrás registrarte de nuevo con el mismo correo.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}


// --- RUTAS DE AUTENTICACIÓN (REESCRITAS CON MONGOOSE) ---
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
    }
    
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ success: false, message: "Este correo ya está registrado." });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const nuevoUsuario = new User({
      nombre,
      email,
      password,
      rol: 'usuario comprador',
      isVerified: false,
      verificationToken,
      verificationExpires
    });

    await nuevoUsuario.save();

    
    try {
      await sendVerificationEmail(nuevoUsuario);
    } catch (mailErr) {
      console.error("Error enviando correo de verificación:", mailErr);

      return res.status(500).json({
        success: false,
        message: "No se pudo enviar el correo de verificación. Intenta más tarde."
      });
    }
    
    return res.status(201).json({
      success: true,
      message: "Registro exitoso. Te enviamos un correo para verificar tu cuenta."
    });

  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
  }
});


app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }
    
    if (usuario.password !== password) {
      return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
    }

    
    if (usuario.rol === 'usuario comprador' && !usuario.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
      });
    }
    
    res.json({
      success: true,
      message: `¡Bienvenido, ${usuario.nombre}!`,
      user: { _id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
  }
});


// --- Verificación de correo  ---
app.get('/auth/verify-email', async (req, res) => {
  try {
    const { token, action } = req.query;

    if (!token) {
      return res.status(400).send('<h1>Solicitud inválida</h1><p>Falta el token.</p>');
    }

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).send('<h1>Enlace inválido</h1><p>El enlace ya fue usado o no existe.</p>');
    }

    // Verificar vigencia
    if (user.verificationExpires && user.verificationExpires < new Date()) {
      
      await User.deleteOne({ _id: user._id });
      return res
        .status(400)
        .send('<h1>Enlace expirado</h1><p>El enlace de verificación ha expirado. Vuelve a registrarte.</p>');
    }

    
    if (action === 'reject') {
      await User.deleteOne({ _id: user._id });
      return res.send(`
        <html>
          <head><meta charset="utf-8"><title>Registro cancelado</title></head>
          <body style="font-family: Arial, sans-serif;">
            <h1>Registro cancelado</h1>
            <p>Hemos eliminado los datos asociados a este correo.</p>
          </body>
        </html>
      `);
    }

    
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    return res.send(`
      <html>
        <head>
          <meta charset="utf-8">
          <title>Correo verificado</title>
          <meta http-equiv="refresh" content="5;url=/index.html">
        </head>
        <body style="font-family: Arial, sans-serif; text-align:center; padding: 40px;">
          <h1>¡Correo verificado correctamente!</h1>
          <p>Tu cuenta de comprador ha sido activada.</p>
          <p>Ahora puedes iniciar sesión con tu correo y contraseña.</p>
          <p>Te redirigiremos al inicio en unos segundos...</p>
          <p><a href="/index.html">Ir ahora a History Keepers</a></p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("Error en verificación de correo:", error);
    return res.status(500).send('<h1>Error del servidor</h1><p>Intenta más tarde.</p>');
  }
});


// --- API DE PRODUCTOS (MODIFICADA PARA CLOUDINARY) ---

// 1. OBTENER (GET) - (Sin cambios)
app.get('/api/products', async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    const items = await Product.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await Product.countDocuments(query);
    res.json({ items, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CREAR (POST) - (Modificado para Cloudinary)
app.post('/api/products', upload.array('images', 5), async (req, res) => {
  try {
    const data = req.body;
    
    const barcode = Date.now().toString().slice(3) + Math.floor(1000 + Math.random() * 9000);
    data.barcode = barcode;
    data.status = 'Disponible';

    if (req.files && req.files.length > 0) {
      // --- CAMBIO ---
      // 'file.path' ahora es la URL segura de Cloudinary
      data.images = req.files.map(file => file.path); 
    }
    if (data.highlights) {
      data.highlights = data.highlights.split(',').map(h => h.trim()).filter(h => h);
    }
    
    const newProduct = new Product(data);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ACTUALIZAR (PUT) - (Modificado para Cloudinary)
app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const existingProduct = await Product.findById(id);
    if (!existingProduct) return res.status(404).json({ message: 'Producto no encontrado' });

    let images = existingProduct.images || [];
    if (req.files && req.files.length > 0) {
      // --- CAMBIO ---
      // 'file.path' ahora es la URL segura de Cloudinary
      const newImages = req.files.map(file => file.path);
      images = images.concat(newImages);
    }
    updateData.images = images;
    
    if (updateData.highlights) {
      updateData.highlights = updateData.highlights.split(',').map(h => h.trim()).filter(h => h);
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. ELIMINAR (DELETE) - (Sin cambios)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Producto no encontrado' });
    
    res.json({ ok: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. ELIMINAR (DELETE) una imagen - (Modificado para Cloudinary)
app.delete('/api/products/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const { imagePath } = req.body; // imagePath es la URL de Cloudinary
    if (!imagePath) return res.status(400).json({ message: 'No se especificó la ruta de la imagen.' });

    // 1. Quitar de MongoDB
    await Product.findByIdAndUpdate(id, { $pull: { images: imagePath } });

    // --- 2. Borrar de Cloudinary ---
    // Extraer el 'public_id' de la URL (ej. HistoryKeepersProducts/filename)
    const publicIdWithFolder = imagePath.split('/').slice(-2).join('/').split('.')[0];
    
    cloudinary.uploader.destroy(publicIdWithFolder, (error, result) => {
      if (error) {
        console.warn(`No se pudo borrar la imagen de Cloudinary: ${publicIdWithFolder}`, error);
      }
    });

    res.json({ success: true, message: 'Imagen eliminada.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
    const { customerDetails, products, subtotal, shippingCost, total, tipoVenta } = req.body;
    
    // 1. VALIDACIÓN DE STOCK (CRÍTICO)
    // Obtenemos los IDs de los productos que el cliente quiere comprar
    const productIds = products.map(p => p.product);
    
    // Buscamos esos productos en la base de datos real
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    
    // Verificamos si alguno NO está disponible
    const unavailableProduct = dbProducts.find(p => p.status !== 'Disponible');
    
    if (unavailableProduct) {
      return res.status(409).json({ // 409 Conflict
        success: false,
        message: `Lo sentimos, el artículo "${unavailableProduct.name}" ya no está disponible (se vendió hace un momento).`
      });
    }

    // 2. Si todo está disponible, procedemos
    const orderNumber = `HK-${Date.now().toString().slice(5)}`;
    
    // Actualizamos el estatus a 'Pendiente de envío' para bloquearlos inmediatamente
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { status: 'Pendiente de envío' } }
    );
    
    const newOrder = new Order({
      orderNumber,
      customerDetails,
      products,
      subtotal,
      shippingCost,
      total,
      tipoVenta,
      status: 'Pagado' // Simulamos pago exitoso
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

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    
    if (status === 'Cancelado') {
      const productIds = order.products.map(p => p.product);
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { status: 'Disponible' } }
      );
    }
    
    if (status === 'Entregado') {
       const productIds = order.products.map(p => p.product);
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { status: 'Vendido' } }
      );
    }

    await order.save();
    res.json(order);
  } catch (error) {
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

// --- API DE PERFIL DE COMPRADOR ---

// OBTENER (GET) los datos del perfil de un usuario
app.get('/api/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Buscamos al usuario por ID y excluimos el password
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ACTUALIZAR (PUT) los datos del perfil (nombre, email, teléfono)
app.put('/api/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ message: 'Nombre y Email son obligatorios.' });
    }

    // Verificar si el nuevo email ya está en uso por OTRO usuario
    const emailEnUso = await User.findOne({ email: email, _id: { $ne: id } });
    if (emailEnUso) {
      return res.status(400).json({ message: 'Ese email ya está en uso.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { nombre, email, telefono } },
      { new: true } // Devuelve el documento actualizado
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ success: true, message: 'Perfil actualizado', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ACTUALIZAR (PUT) la contraseña
app.put('/api/password/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    await User.findByIdAndUpdate(id, { $set: { password: newPassword } });

    res.json({ success: true, message: 'Contraseña actualizada.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/my-orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Encontrar al usuario para obtener su email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // 2. Buscar todos los pedidos que coincidan con ese email
    // (Usamos el email como "llave" para vincular los pedidos)
    const orders = await Order.find({ 
      'customerDetails.email': user.email 
    }).sort({ createdAt: -1 }); // Ordenar por más reciente

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/profile/:id/addresses', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('direccionesGuardadas');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user.direccionesGuardadas); // Devuelve solo el array de direcciones
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// AÑADIR (POST) una nueva dirección
app.post('/api/profile/:id/addresses', async (req, res) => {
  try {
    const { id } = req.params;
    const newAddress = req.body; // El objeto de dirección viene en el body

    // Validar campos (basado en tu user.model.js)
    if (!newAddress.alias || !newAddress.calle || !newAddress.colonia || !newAddress.ciudad || !newAddress.cp) {
       return res.status(400).json({ message: 'Faltan campos obligatorios para la dirección' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $push: { direccionesGuardadas: newAddress } }, // $push añade al array
      { new: true } // Devuelve el usuario actualizado
    ).select('direccionesGuardadas');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(201).json(user.direccionesGuardadas); // Devuelve el array actualizado
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ELIMINAR (DELETE) una dirección
app.delete('/api/profile/:id/addresses/:addrId', async (req, res) => {
  try {
    const { id, addrId } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { $pull: { direccionesGuardadas: { _id: addrId } } }, // $pull quita del array por ID
      { new: true }
    ).select('direccionesGuardadas');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user.direccionesGuardadas); // Devuelve el array actualizado
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/profile/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('paymentMethods');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user.paymentMethods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// AÑADIR (POST) un nuevo método de pago
app.post('/api/profile/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const newPayment = req.body; // { alias, cardholderName, cardNumber, expiryDate }

    // Validar campos
    if (!newPayment.alias || !newPayment.cardholderName || !newPayment.cardNumber || !newPayment.expiryDate) {
       return res.status(400).json({ message: 'Faltan campos obligatorios para el método de pago' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $push: { paymentMethods: newPayment } },
      { new: true }
    ).select('paymentMethods');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(201).json(user.paymentMethods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ELIMINAR (DELETE) un método de pago
app.delete('/api/profile/:id/payments/:payId', async (req, res) => {
  try {
    const { id, payId } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { $pull: { paymentMethods: { _id: payId } } },
      { new: true }
    ).select('paymentMethods');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user.paymentMethods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- INICIALIZACIÓN DEL SERVIDOR ---
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Conectado a la base de datos con Mongoose`);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB. La aplicación no puede iniciar.", error);
    process.exit(1);
  }
}

startServer();