const InventoryItem = require('../models/InventoryItem');

exports.getInventory = async (req, res) => {
  res.json(await InventoryItem.find());
};

exports.addInventory = async (req, res) => {
  res.json(await InventoryItem.create(req.body));
};
