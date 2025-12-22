const express = require('express');
const router = express.Router();
const Complain = require('../models/Complain');

/* ===============================
   ADD COMPLAINT
================================*/
router.post('/', async (req, res) => {
  try {
    const complain = new Complain(req.body);
    await complain.save();
    res.status(201).json({ message: 'Complaint added', complain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   UPDATE / EDIT COMPLAINT
================================*/
router.put('/:id', async (req, res) => {
  try {
    const updated = await Complain.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   DISPLAY ALL
================================*/
router.get('/', async (req, res) => {
  const list = await Complain.find().sort({ dated: -1 });
  res.json(list);
});

/* ===============================
   BY USERNAME
================================*/
router.get('/by-username/:username', async (req, res) => {
  const list = await Complain.find({ username: req.params.username });
  res.json(list);
});

/* ===============================
   BY CLASS
================================*/
router.get('/by-class/:class', async (req, res) => {
  const list = await Complain.find({ class: req.params.class });
  res.json(list);
});

/* ===============================
   SEARCH BY RESOLVED / UNRESOLVED
================================*/
router.get('/by-resolved/:status', async (req, res) => {
  const resolved = req.params.status === 'true';
  const list = await Complain.find({ resolved });
  res.json(list);
});

/* ===============================
   UNRESOLVED LIST (SHORTCUT)
================================*/
router.get('/unresolved', async (req, res) => {
  const list = await Complain.find({ resolved: false });
  res.json(list);
});

module.exports = router;
