const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  rol: {
    type: String,
    enum: ['usuario comprador', 'trabajador', 'gerente', 'administrador'],
    default: 'usuario comprador'
  }
}, { 
  timestamps: true,
  collection: 'usuarios' // <-- ¡ESTA ES LA LÍNEA DE LA SOLUCIÓN!
});

const User = mongoose.model('User', userSchema);
module.exports = User;