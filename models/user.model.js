const mongoose = require('mongoose');

// --- Sub-documento para las direcciones ---
const addressSchema = new mongoose.Schema({
  alias: { type: String, required: true, trim: true }, 
  calle: { type: String, required: true, trim: true },
  colonia: { type: String, required: true, trim: true },
  ciudad: { type: String, required: true, trim: true },
  cp: { type: String, required: true, trim: true }
});

// --- Sub-documento para Métodos de Pago (Simulado) ---
const paymentMethodSchema = new mongoose.Schema({
  alias: { type: String, required: true, trim: true },
  cardholderName: { type: String, required: true, trim: true },
  cardNumber: { type: String, required: true, trim: true },
  expiryDate: { type: String, required: true, trim: true }
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

  // --- Verificación de correo ---
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date },

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
