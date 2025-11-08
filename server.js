const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = 3000;

// --- IMPORTANTE: usa tu cadena de conexión segura (variables de entorno en producción)
const MONGO_URI = "mongodb+srv://Salinas_user:rutabus123@rutabus.qdwcba8.mongodb.net/?retryWrites=true&w=majority&appName=Rutabus";
const DB_NAME = "history_keepers_db";
let db;

// Middlewares
app.use(express.json());

// Servir estáticos desde la raíz del proyecto (index.html, /assets, /producto, /carrito, etc.)
app.use(express.static(path.join(__dirname), {
  extensions: ['html'] // permite resolver /ruta -> /ruta.html si aplica
}));

// --- RUTAS DE AUTENTICACIÓN ---

// REGISTRO DE NUEVOS USUARIOS
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

    // Rol por defecto: comprador/usuario
    const nuevoUsuario = { nombre, email, password, rol: 'usuario comprador' };
    await usuarios.insertOne(nuevoUsuario);

    res.status(201).json({ success: true, message: "¡Registro exitoso! Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
  }
});

// LOGIN DE USUARIOS
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuarios = db.collection('usuarios');

    const usuario = await usuarios.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }

    // ADVERTENCIA: Comparación en texto plano. (Uso educativo)
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

// (opcional) Ruta catch-all para SPA / refrescos directos: sirve index
// app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));

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
