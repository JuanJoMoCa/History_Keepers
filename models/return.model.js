const mongoose = require('mongoose');
const { Schema } = mongoose;

const returnSchema = new mongoose.Schema({
  originalOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  customerEmail: { type: String, required: true },
  reason: { type: String, required: true },
  
  // Qué productos de la orden original se devuelven
  productsToReturn: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      qty: Number
    }
  ],
  
  status: {
    type: String,
    enum: ['Solicitada', 'Aprobada', 'Rechazada', 'Completada'],
    default: 'Solicitada'
  }
}, { timestamps: true });

const ReturnTicket = mongoose.model('ReturnTicket', returnSchema);
module.exports = ReturnTicket;