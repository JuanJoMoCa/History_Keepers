const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // <-- Importamos ObjectId
const path = require('path');

const app = express();
const PORT = 3000;

// --- Conexión a MongoDB ---
const MONGO_URI = "mongodb+srv://Salinas_user:rutabus123@rutabus.qdwcba8.mongodb.net/?retryWrites=true&w=majority&appName=Rutabus";
const DB_NAME = "history_keepers_db";
let db;

// Middlewares
app.use(express.json()); // Para entender JSON
app.use(express.urlencoded({ extended: true })); // Para entender formularios

// Servir estáticos (tu estructura de carpetas funciona con esto)
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));

// --- RUTAS DE AUTENTICACIÓN ---
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
    }
    const usuarios = db.collection('usuarios');
    const usuarioExistente = await usuarios.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ success: false, message: "Este correo ya está registrado." });
    }
    const nuevoUsuario = { nombre, email, password, rol: 'usuario comprador' };
    await usuarios.insertOne(nuevoUsuario);
    res.status(201).json({ success: true, message: "¡Registro exitoso! Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuarios = db.collection('usuarios');
    const usuario = await usuarios.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }
    if (usuario.password !== password) {
      return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
    }
    res.json({
      success: true,
      message: `¡Bienvenido, ${usuario.nombre}!`,
      user: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
  }
});

// --- NUEVA API DE PRODUCTOS (CRUD) ---

// 1. OBTENER (GET) todos los productos (con paginación y búsqueda)
app.get('/api/products', async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      // Búsqueda por nombre o categoría
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    const productsCol = db.collection('products');
    const items = await productsCol.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();
    const total = await productsCol.countDocuments(query);
    res.json({ items, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CREAR (POST) un nuevo producto
app.post('/api/products', async (req, res) => {
  try {
    // Recibimos el producto como JSON
    const newProductData = req.body;
    
    // Limpiamos datos vacíos
    if (newProductData.highlights && !Array.isArray(newProductData.highlights)) {
      newProductData.highlights = newProductData.highlights.split(',').map(h => h.trim()).filter(h => h);
    }
    if (newProductData.images && !Array.isArray(newProductData.images)) {
      newProductData.images = newProductData.images.split(',').map(i => i.trim()).filter(i => i);
    }

    const productsCol = db.collection('products');
    const result = await productsCol.insertOne(newProductData);
    res.status(201).json({ ...newProductData, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ACTUALIZAR (PUT) un producto por ID
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Limpiamos datos vacíos
    if (updateData.highlights && !Array.isArray(updateData.highlights)) {
      updateData.highlights = updateData.highlights.split(',').map(h => h.trim()).filter(h => h);
    }
    if (updateData.images && !Array.isArray(updateData.images)) {
      updateData.images = updateData.images.split(',').map(i => i.trim()).filter(i => i);
    }

    const productsCol = db.collection('products');
    const result = await productsCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ ...updateData, _id: id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. ELIMINAR (DELETE) un producto por ID
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productsCol = db.collection('products');
    const result = await productsCol.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ ok: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// --- INICIALIZACIÓN DEL SERVIDOR ---
async function startServer() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✅ Conectado a la base de datos: ${DB_NAME}`);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB. La aplicación no puede iniciar.", error);
    process.exit(1);
  }
}

startServer();