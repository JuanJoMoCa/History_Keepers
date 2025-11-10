const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new mongoose.Schema({
  // Identificador
  orderNumber: { type: String, unique: true, required: true },
  
  // Cliente
  customerDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true }
  },

  // Productos comprados (referencias a los productos reales)
  products: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      price: Number, // Precio al momento de la compra
      qty: Number
    }
  ],
  
  // Totales
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, required: true },
  total: { type: Number, required: true },
  
  // Estatus de la venta y envío
  tipoVenta: {
    type: String,
    enum: ['Online', 'Física'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pagado', 'En Preparación', 'Enviado', 'Entregado', 'Cancelado', 'Devuelto'],
    default: 'Pagado'
  },
  trackingNumber: { type: String, default: '' }

}, { timestamps: true }); // createdAt será la fecha de la venta

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;