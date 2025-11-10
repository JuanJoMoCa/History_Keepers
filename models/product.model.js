const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  images: [{ type: String }],
  highlights: [{ type: String }],
  discount: { type: Number, min: 0, max: 100, default: 0 },

  // --- NUEVOS CAMPOS ---
  status: {
    type: String,
    enum: ['Disponible', 'Pendiente de envío', 'Vendido'],
    default: 'Disponible'
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true // Permite valores nulos sin violar la unicidad
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;