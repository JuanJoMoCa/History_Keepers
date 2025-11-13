const mongoose = require('mongoose');

// --- Sub-documento para las direcciones ---
const addressSchema = new mongoose.Schema({
  alias: { type: String, required: true, trim: true }, // ej. "Casa", "Oficina"
  calle: { type: String, required: true, trim: true },
  colonia: { type: String, required: true, trim: true },
  ciudad: { type: String, required: true, trim: true },
  cp: { type: String, required: true, trim: true }
});

// --- NUEVO: Sub-documento para Métodos de Pago (Simulado) ---
const paymentMethodSchema = new mongoose.Schema({
  alias: { type: String, required: true, trim: true }, // ej. "Visa (Termina 4242)"
  cardholderName: { type: String, required: true, trim: true },
  cardNumber: { type: String, required: true, trim: true }, // (Simulado, no encriptado)
  expiryDate: { type: String, required: true, trim: true } // "MM/AA"
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
  
  // --- CAMPOS ACTUALIZADOS ---
  
  // Para la pestaña "Perfil"
  telefono: { type: String, trim: true, default: '' },
  
  // Para la pestaña "Direcciones"
  direccionesGuardadas: [addressSchema],
  
  // Para la pestaña "Métodos de Pago" (Simulado)
  paymentMethods: [paymentMethodSchema]
  
}, { 
  timestamps: true,
  collection: 'usuarios'
});

const User = mongoose.model('User', userSchema);
module.exports = User;