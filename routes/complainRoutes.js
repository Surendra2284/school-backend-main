const express = require('express');

const router = express.Router();

const Complain = require('../models/Complain');

const { emitNoticeChanged } = require('../server');

/* =========================================================
   ADD COMPLAINT
========================================================= */

router.post('/', async (req, res) => {

  try {

    const complain = new Complain(req.body);

    await complain.save();

    // SSE EVENT
    emitNoticeChanged({

      type: 'complaint-added',

      complaintId: complain._id,

      username: complain.username,

      className: complain.class
    });

    return res.status(201).json({

      message: 'Complaint added successfully.',

      complain
    });

  } catch (err) {

    console.error(
      'Error adding complaint:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   UPDATE / EDIT COMPLAINT
========================================================= */

router.put('/:id', async (req, res) => {

  try {

    const updated =
      await Complain.findByIdAndUpdate(

        req.params.id,

        req.body,

        {
          new: true,
          runValidators: true
        }
      );

    if (!updated) {

      return res.status(404).json({

        message: 'Complaint not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type: 'complaint-updated',

      complaintId: updated._id,

      resolved: updated.resolved
    });

    return res.status(200).json({

      message:
        'Complaint updated successfully.',

      complain: updated
    });

  } catch (err) {

    console.error(
      'Error updating complaint:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   GET ALL COMPLAINTS
========================================================= */

router.get('/', async (req, res) => {

  try {

    const list = await Complain.find()
      .sort({ dated: -1 });

    return res.status(200).json(list);

  } catch (err) {

    console.error(
      'Error fetching complaints:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   GET BY USERNAME
========================================================= */

router.get('/by-username/:username', async (req, res) => {

  try {

    const list = await Complain.find({

      username: req.params.username
    })
      .sort({ dated: -1 });

    return res.status(200).json(list);

  } catch (err) {

    console.error(
      'Error fetching complaints by username:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   GET BY CLASS
========================================================= */

router.get('/by-class/:class', async (req, res) => {

  try {

    const list = await Complain.find({

      class: req.params.class
    })
      .sort({ dated: -1 });

    return res.status(200).json(list);

  } catch (err) {

    console.error(
      'Error fetching complaints by class:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   GET BY RESOLVED STATUS
========================================================= */

router.get('/by-resolved/:status', async (req, res) => {

  try {

    const resolved =
      req.params.status === 'true';

    const list = await Complain.find({
      resolved
    })
      .sort({ dated: -1 });

    return res.status(200).json(list);

  } catch (err) {

    console.error(
      'Error fetching complaints by resolved status:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   GET UNRESOLVED COMPLAINTS
========================================================= */

router.get('/unresolved', async (req, res) => {

  try {

    const list = await Complain.find({

      resolved: false
    })
      .sort({ dated: -1 });

    return res.status(200).json(list);

  } catch (err) {

    console.error(
      'Error fetching unresolved complaints:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   DELETE SINGLE COMPLAINT
========================================================= */

router.delete('/:id', async (req, res) => {

  try {

    const deleted =
      await Complain.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {

      return res.status(404).json({

        message: 'Complaint not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type: 'complaint-deleted',

      complaintId: req.params.id
    });

    return res.status(200).json({

      message:
        'Complaint deleted successfully.',

      id: req.params.id
    });

  } catch (err) {

    console.error(
      'Error deleting complaint:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

/* =========================================================
   DELETE ALL RESOLVED COMPLAINTS
========================================================= */

router.delete('/resolved/all', async (req, res) => {

  try {

    const result =
      await Complain.deleteMany({

        resolved: true
      });

    // SSE EVENT
    emitNoticeChanged({

      type: 'resolved-complaints-deleted',

      deletedCount:
        result.deletedCount
    });

    return res.status(200).json({

      message:
        'Resolved complaints deleted successfully.',

      deletedCount:
        result.deletedCount
    });

  } catch (err) {

    console.error(
      'Error deleting resolved complaints:',
      err
    );

    return res.status(500).json({

      error: err.message
    });
  }
});

module.exports = router;