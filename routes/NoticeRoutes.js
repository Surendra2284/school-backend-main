const express = require('express');
const router = express.Router();

const Notice = require('../models/Notice');
const { emitNoticeChanged } = require('../server');

/**
 * =========================================================
 * Get Notices By Role
 * =========================================================
 */
router.get('/role/:role', async (req, res) => {
  try {

    const role = req.params.role;

    const notices = await Notice.find({
      Role: role
    });

    if (notices.length === 0) {
      return res.status(404).json({
        message: 'No notices found for the specified role.'
      });
    }

    res.status(200).json(notices);

  } catch (error) {

    console.error('Error fetching notices by role:', error);

    res.status(500).json({
      message: 'An error occurred while fetching notices',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Approve Notice
 * =========================================================
 */
router.put('/approve/:id', async (req, res) => {

  try {

    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );

    if (!notice) {
      return res.status(404).json({
        message: 'Notice not found'
      });
    }

    // SSE EVENT
    emitNoticeChanged({
      type: 'notice-approved',
      notice
    });

    res.json({
      message: 'Notice approved successfully',
      notice
    });

  } catch (error) {

    console.error('Error approving notice:', error);

    res.status(500).json({
      message: 'Failed to approve notice',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Get Notices By Class Teacher
 * =========================================================
 */
router.get('/classteacher/:classteacher', async (req, res) => {

  try {

    const classteacher = req.params.classteacher;

    const notices = await Notice.find({
      classteacher
    });

    if (notices.length === 0) {
      return res.status(404).json({
        message: 'No notices found for the specified class teacher.'
      });
    }

    res.status(200).json(notices);

  } catch (error) {

    console.error('Error fetching notices by classteacher:', error);

    res.status(500).json({
      message: 'An error occurred while fetching notices',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Get Pending Notices
 * =========================================================
 */
router.get('/pending-notices', async (req, res) => {

  try {

    const notices = await Notice.find({
      isApproved: false
    });

    res.json(notices);

  } catch (error) {

    console.error('Error fetching pending notices:', error);

    res.status(500).json({
      message: 'Failed to fetch pending notices',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Get Approved Notices
 * =========================================================
 */
router.get('/approved', async (req, res) => {

  try {

    const notices = await Notice.find({
      isApproved: true
    }).sort({ date: -1 });

    res.json(notices);

  } catch (error) {

    console.error('Error fetching approved notices:', error);

    res.status(500).json({
      message: 'Failed to fetch approved notices',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Get Notices By Approval Status
 * =========================================================
 */
router.get('/isApproved/:status', async (req, res) => {

  try {

    const isApproved = req.params.status === 'true';

    const notices = await Notice.find({
      isApproved
    });

    res.json(notices);

  } catch (error) {

    console.error('Error fetching filtered notices:', error);

    res.status(500).json({
      message: 'Failed to fetch notices',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Add Notice
 * =========================================================
 */
router.post('/', async (req, res) => {

  try {

    const newNotice = new Notice(req.body);

    const savedNotice = await newNotice.save();

    // SSE EVENT
    emitNoticeChanged({
      type: 'notice-added',
      notice: savedNotice
    });

    res.status(201).json(savedNotice);

  } catch (error) {

    console.error('Error adding notice:', error);

    res.status(500).json({
      message: 'Failed to add notice',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Get All Notices
 * =========================================================
 */
router.get('/', async (req, res) => {

  try {

    const notices = await Notice.find();

    res.status(200).json(notices);

  } catch (error) {

    console.error('Error fetching notices:', error);

    res.status(500).json({
      message: 'Failed to fetch notices',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Edit Notice
 * =========================================================
 */
router.put('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const updatedNotice = await Notice.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedNotice) {
      return res.status(404).json({
        message: 'Notice not found!'
      });
    }

    // SSE EVENT
    emitNoticeChanged({
      type: 'notice-updated',
      notice: updatedNotice
    });

    res.status(200).json(updatedNotice);

  } catch (error) {

    console.error('Error editing notice:', error);

    res.status(500).json({
      message: 'Failed to edit notice',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Delete Notice
 * =========================================================
 */
router.delete('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const deletedNotice = await Notice.findByIdAndDelete(id);

    if (!deletedNotice) {
      return res.status(404).json({
        message: 'Notice not found!'
      });
    }

    // SSE EVENT
    emitNoticeChanged({
      type: 'notice-deleted',
      noticeId: id
    });

    res.status(200).json({
      message: 'Notice deleted successfully!'
    });

  } catch (error) {

    console.error('Error deleting notice:', error);

    res.status(500).json({
      message: 'Failed to delete notice',
      error: error.message
    });

  }
});

module.exports = router;