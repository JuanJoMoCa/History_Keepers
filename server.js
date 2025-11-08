const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const multer = require('multer'); // <-- 1. Importamos Multer
const fs = require('fs');

const app = express();
const PORT = 3000;

// --- Conexión a MongoDB ---
const MONGO_URI = "mongodb+srv://Salinas_user:rutabus123@rutabus.qdwcba8.mongodb.net/?retryWrites=true&w=majority&appName=Rutabus";
const DB_NAME = "history_keepers_db";
let db;

// --- 2. Configuración de Multer (Subida de Archivos) ---
const fileStorage = multer.diskStorage({
  // Destino: dónde se guardan los archivos
  destination: (req, file, cb) => {
    cb(null, 'assets/uploads');
  },
  // Nombre del archivo: para evitar colisiones, le ponemos un timestamp
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: fileStorage });

// Middlewares
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Servir estáticos
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));
// Hacemos que la carpeta /assets/ sea accesible públicamente
app.use('/assets', express.static(path.join(__dirname, 'assets')));


// --- RUTAS DE AUTENTICACIÓN (Sin cambios) ---
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

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productsCol = db.collection('products');
    
    // Buscar el producto por su ObjectId
    const product = await productsCol.findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    res.json(product); // Devuelve el producto encontrado
  } catch (error) {
    // Manejo de error si el ID no es válido
    if (error.name === 'BSONTypeError') {
      return res.status(404).json({ message: 'ID de producto no válido' });
    }
    res.status(500).json({ message: error.message });
  }
});

// 2. CREAR (POST) - Modificado para recibir FormData y archivos
// upload.array('images', 5) significa: "acepta hasta 5 archivos del campo 'images'"
app.post('/api/products', upload.array('images', 5), async (req, res) => {
  try {
    const newProductData = req.body;
    
    // --- CORRECCIÓN DE BUG ---
    // El problema estaba aquí. req.files es un array de archivos.
    // Usamos .map() para crear un array de strings (las rutas).
    if (req.files && req.files.length > 0) {
      newProductData.images = req.files.map(file => `/assets/uploads/${file.filename}`);
    } else {
      newProductData.images = [];
    }

    if (newProductData.highlights) {
      newProductData.highlights = newProductData.highlights.split(',').map(h => h.trim()).filter(h => h);
    } else {
      newProductData.highlights = [];
    }

    const productsCol = db.collection('products');
    const result = await productsCol.insertOne(newProductData);
    res.status(201).json({ ...newProductData, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ACTUALIZAR (PUT) - Modificado para recibir FormData y archivos
app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const productsCol = db.collection('products');

    // --- INICIO DE LA CORRECCIÓN ---

    // 1. Buscar el producto existente para obtener su array de imágenes actual
    const existingProduct = await productsCol.findOne({ _id: new ObjectId(id) });
    if (!existingProduct) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // 2. Empezar con la lista de imágenes que ya tenía
    let images = existingProduct.images || [];

    // 3. Si se subieron archivos nuevos (req.files), añadirlos a la lista
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/assets/uploads/${file.filename}`);
      images = images.concat(newImages); // Combina el array antiguo con el nuevo
    }
    
    // 4. Asignar el array de imágenes combinado a los datos de actualización
    updateData.images = images;
    
    // --- FIN DE LA CORRECCIÓN ---

    // Procesar highlights (esto ya estaba bien)
    if (updateData.highlights) {
      updateData.highlights = updateData.highlights.split(',').map(h => h.trim()).filter(h => h);
    } else {
      // Si el campo de highlights viene vacío, asegúrate de que sea un array vacío
      updateData.highlights = [];
    }

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

// 4. ELIMINAR (DELETE) - Sin cambios
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

app.delete('/api/products/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const { imagePath } = req.body; // Recibimos la ruta de la imagen a borrar

    if (!imagePath) {
      return res.status(400).json({ message: 'No se especificó la ruta de la imagen.' });
    }

    // 1. Eliminar la referencia de MongoDB
    const productsCol = db.collection('products');
    const updateResult = await productsCol.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { images: imagePath } } // $pull quita un elemento de un array
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    // 2. Eliminar el archivo del servidor
    // Construimos la ruta local (ej. 'assets/uploads/12345.jpg')
    const localPath = path.join(__dirname, imagePath);
    
    fs.unlink(localPath, (err) => {
      if (err) {
        console.warn(`No se pudo borrar el archivo: ${localPath}. Puede que ya estuviera borrado.`);
      }
    });

    res.json({ success: true, message: 'Imagen eliminada.' });

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