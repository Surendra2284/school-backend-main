const express = require('express');
const router = express.Router();
const TeacherTask = require('../models/TeacherTask');

/* ===========================
   ADD TASK
=========================== */
router.post('/add', async (req, res) => {
  try {
    const task = new TeacherTask(req.body);
    await task.save();
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    res.status(400).json({ message: 'Error creating task', error: err.message });
  }
});

/* ===========================
   DISPLAY ALL TASKS
=========================== */
router.get('/all', async (req, res) => {
  try {
    const tasks = await TeacherTask.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   SEARCH BY TASK FOR USER
=========================== */
router.get('/by-user/:username', async (req, res) => {
  try {
    const tasks = await TeacherTask.find({ taskForUser: req.params.username });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   SEARCH BY SINGLE DATE
=========================== */
router.get('/by-date/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const tasks = await TeacherTask.find({
      taskCreateDate: { $gte: date, $lt: nextDay }
    });

    res.json(tasks);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ===========================
   SEARCH BY DATE RANGE
=========================== */
router.get('/by-date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const tasks = await TeacherTask.find({
      taskCreateDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    res.json(tasks);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ===========================
   UPDATE TASK (FULL)
=========================== */
router.put('/update/:id', async (req, res) => {
  try {
    const updatedTask = await TeacherTask.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedOn: new Date() },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ===========================
   UPDATE ONLY UPDATEDON
=========================== */
router.patch('/update-updatedon/:id', async (req, res) => {
  try {
    const task = await TeacherTask.findByIdAndUpdate(
      req.params.id,
      { updatedOn: new Date() },
      { new: true }
    );

    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ===========================
   DELETE TASK
=========================== */
router.delete('/delete/:id', async (req, res) => {
  try {
    const deleted = await TeacherTask.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
