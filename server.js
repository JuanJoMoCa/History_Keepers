const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = 3000;

// --- ¡IMPORTANTE! Reemplaza esto con tu propia cadena de conexión de MongoDB Atlas ---
const MONGO_URI = "mongodb+srv://Salinas_user:rutabus123@rutabus.qdwcba8.mongodb.net/?retryWrites=true&w=majority&appName=Rutabus";
const DB_NAME = "history_keepers_db";
let db;

// Middlewares para entender JSON y servir archivos estáticos (tu index.html, css, etc.)
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- RUTAS DE AUTENTICACIÓN ---

// REGISTRO DE NUEVOS USUARIOS
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        const coleccionUsuarios = db.collection('usuarios');

        // 1. Verificar si el correo ya existe
        const usuarioExistente = await coleccionUsuarios.findOne({ email: email });
        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: "Este correo ya está registrado." });
        }

        // 2. Crear el nuevo usuario (comprador por defecto)
        const nuevoUsuario = { nombre, email, password, rol: 'usuario comprador' }; // Rol fijo
        await coleccionUsuarios.insertOne(nuevoUsuario);

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
        const usuario = await db.collection('usuarios').findOne({ email: email });

        if (!usuario) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado." });
        }
        
        // ADVERTENCIA: Comparación de contraseña en texto plano. Solo para fines educativos.
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