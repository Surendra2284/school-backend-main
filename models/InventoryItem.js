const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: String,
  category: String,
  quantity: Number,
  price: Number
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventorySchema);
