const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: String,
  category: String, // Uniform / Lab / Stationery
  price: Number,
  quantity: Number
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
