const mongoose = require('mongoose');

// --- NUEVO: Sub-documento para las direcciones ---
const addressSchema = new mongoose.Schema({
  alias: { type: String, required: true, trim: true }, // ej. "Casa", "Oficina"
  calle: { type: String, required: true, trim: true },
  colonia: { type: String, required: true, trim: true },
  ciudad: { type: String, required: true, trim: true },
  cp: { type: String, required: true, trim: true }
});

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  rol: {
    type: String,
    enum: ['usuario comprador', 'trabajador', 'gerente', 'administrador'],
    default: 'usuario comprador'
  },
  
  // --- NUEVOS CAMPOS AÑADIDOS ---
  
  // Para la pestaña "Perfil"
  telefono: { type: String, trim: true, default: '' },
  
  // Para la pestaña "Direcciones"
  direccionesGuardadas: [addressSchema],
  
  // Para la pestaña "Métodos de Pago" (Stripe)
  stripeCustomerId: { type: String, unique: true, sparse: true }
  
}, { 
  timestamps: true,
  collection: 'usuarios'
});

const User = mongoose.model('User', userSchema);
module.exports = User;