const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Importar TODOS los modelos
const Product = require('./models/product.model.js');
const Order = require('./models/order.model.js');
const ReturnTicket = require('./models/return.model.js');
const User = require('./models/user.model.js'); // <-- Importar nuevo modelo

const app = express();
const PORT = 3000;

// --- Conexión a MongoDB (con Mongoose) ---
// El nombre de la BD (history_keepers_db) va en la URI
const MONGO_URI = "mongodb+srv://Salinas_user:rutabus123@rutabus.qdwcba8.mongodb.net/history_keepers_db?retryWrites=true&w=majority&appName=Rutabus";

// Configuración de Multer (sin cambios)
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'assets/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: fileStorage });

// Middlewares
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));


// --- RUTAS DE AUTENTICACIÓN (REESCRITAS CON MONGOOSE) ---

app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
    }
    
    // Usar Mongoose para buscar
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ success: false, message: "Este correo ya está registrado." });
    }
    
    // Usar Mongoose para crear
    const nuevoUsuario = new User({ nombre, email, password, rol: 'usuario comprador' });
    await nuevoUsuario.save();
    
    res.status(201).json({ success: true, message: "¡Registro exitoso! Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Usar Mongoose para buscar
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }
    
    if (usuario.password !== password) {
      return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
    }
    
    res.json({
      success: true,
      message: `¡Bienvenido, ${usuario.nombre}!`,
      // Enviar solo los datos seguros del usuario
      user: { _id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
  }
});

// --- API DE PRODUCTOS (MODIFICADA PARA MULTER) ---

// 1. OBTENER (GET) - Sin cambios
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
      .sort({ createdAt: -1 }); // Ordenar por más nuevo
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

// 2. CREAR (POST) - Modificado para recibir FormData y archivos
// upload.array('images', 5) significa: "acepta hasta 5 archivos del campo 'images'"
app.post('/api/products', upload.array('images', 5), async (req, res) => {
  try {
    const data = req.body;
    
    // --- LÓGICA DE CÓDIGO DE BARRAS ---
    // Genera un código único basado en el tiempo + 4 dígitos aleatorios
    const barcode = Date.now().toString().slice(3) + Math.floor(1000 + Math.random() * 9000);
    data.barcode = barcode;
    
    // Asigna el estatus inicial
    data.status = 'Disponible';

    if (req.files && req.files.length > 0) {
      data.images = req.files.map(file => `/assets/uploads/${file.filename}`);
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

// 3. ACTUALIZAR (PUT) - Modificado para recibir FormData y archivos
app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const existingProduct = await Product.findById(id);
    if (!existingProduct) return res.status(404).json({ message: 'Producto no encontrado' });

    let images = existingProduct.images || [];
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/assets/uploads/${file.filename}`);
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

// 4. ELIMINAR (DELETE) - Sin cambios
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Producto no encontrado' });
    
    // (Opcional: borrar también las imágenes de /uploads)
    
    res.json({ ok: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/products/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const { imagePath } = req.body;
    if (!imagePath) return res.status(400).json({ message: 'No se especificó la ruta de la imagen.' });

    // 1. Quitar de MongoDB
    await Product.findByIdAndUpdate(id, { $pull: { images: imagePath } });

    // 2. Borrar del servidor
    const localPath = path.join(__dirname, imagePath);
    fs.unlink(localPath, (err) => {
      if (err) console.warn(`No se pudo borrar el archivo: ${localPath}.`);
    });

    res.json({ success: true, message: 'Imagen eliminada.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
    // Lógica para el futuro: el cliente envía su carrito
    const { customerDetails, products, subtotal, shippingCost, total, tipoVenta } = req.body;
    
    // --- LÓGICA DE INVENTARIO ---
    // 1. Generar número de pedido
    const orderNumber = `HK-${Date.now().toString().slice(5)}`;
    
    // 2. Actualizar el status de los productos comprados
    const productIds = products.map(p => p.product); // Asume que el carrito envía los IDs
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { status: 'Pendiente de envío' } }
    );
    
    // 3. Crear el pedido
    const newOrder = new Order({
      orderNumber,
      customerDetails,
      products,
      subtotal,
      shippingCost,
      total,
      tipoVenta,
      status: 'Pagado' // Inicia en "Pagado"
    });
    
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
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
    
    // --- LÓGICA DE INVENTARIO (Devolución/Cancelación) ---
    // Si el admin (o el cliente) lo marca como "Cancelado"
    if (status === 'Cancelado') {
      const productIds = order.products.map(p => p.product);
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { status: 'Disponible' } } // Vuelve a estar disponible
      );
    }
    
    // Si se marca como "Entregado", marcamos el producto como "Vendido"
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

app.get('/api/sales/summary', async (req, res) => {
  try {
    // 1. Ventas por mes (últimos 12 meses)
    const salesByMonth = await Order.aggregate([
      { $match: { status: { $in: ['Entregado', 'Vendido'] } } }, // Contar solo ventas completadas
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalSales: { $sum: "$total" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);
    
    // 2. Ventas por tipo (Online vs Física)
    const salesByType = await Order.aggregate([
      { $match: { status: { $in: ['Entregado', 'Vendido'] } } },
      {
        $group: {
          _id: "$tipoVenta", // 'Online' o 'Física'
          totalSales: { $sum: "$total" }
        }
      }
    ]);
    
    // 3. Pedidos por estatus (para la pestaña "Envíos")
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

app.get('/api/users', async (req, res) => {
  try {
    // Buscamos a todos los usuarios EXCEPTO los 'usuario comprador'
    const users = await User.find({ 
      rol: { $ne: 'usuario comprador' } // $ne = Not Equal
    }).select('-password'); // Aún quitamos el password

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREAR (POST) un nuevo empleado (lo usará el admin)
app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    
    // Validar que el rol sea uno de los permitidos
    const validRoles = ['usuario comprador', 'trabajador', 'gerente', 'administrador'];
    if (!nombre || !email || !password || !validRoles.includes(rol)) {
      return res.status(400).json({ message: 'Todos los campos (nombre, email, password, rol) son obligatorios y el rol debe ser válido.' });
    }

    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Este correo ya está registrado.' });
    }
    
    const nuevoUsuario = new User({ nombre, email, password, rol });
    await nuevoUsuario.save();
    
    // Devolvemos el usuario sin el password
    const userResponse = nuevoUsuario.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ACTUALIZAR (PUT) el ROL de un empleado
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    const validRoles = ['usuario comprador', 'trabajador', 'gerente', 'administrador'];
    if (!validRoles.includes(rol)) {
      return res.status(400).json({ message: 'Rol no válido.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { rol: rol } }, // Solo actualizamos el rol
      { new: true }
    ).select('-password'); // Devolvemos el usuario actualizado sin password

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ELIMINAR (DELETE) un empleado
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

// --- INICIALIZACIÓN DEL SERVIDOR ---
async function startServer() {
  try {
    // 5. Conectar a Mongoose (esto es todo lo que se necesita)
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