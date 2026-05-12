const express = require('express');

const router = express.Router();

const bcrypt = require('bcryptjs');

const User = require('../models/User');

const { emitNoticeChanged } =
  require('../server');

/* =========================================================
   HELPERS
========================================================= */

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeUser = (user) => {

  const obj = user.toObject
    ? user.toObject()
    : user;

  delete obj.password;

  return obj;
};

/* =========================================================
   GET ALL USERS
========================================================= */

router.get('/', async (req, res) => {

  try {

    const {

      role,

      isApproved,

      limit = 100,

      skip = 0

    } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (
      typeof isApproved !==
      'undefined'
    ) {

      query.isApproved =
        isApproved === 'true';
    }

    const total =
      await User.countDocuments(
        query
      );

    const users =
      await User.find(query)

        .select('-password')

        .limit(Number(limit))

        .skip(Number(skip))

        .sort({
          createdAt: -1
        });

    return res.status(200).json({

      total,

      limit:
        Number(limit),

      skip:
        Number(skip),

      users
    });

  } catch (error) {

    console.error(
      'Error fetching users:',
      error
    );

    return res.status(500).json({

      message:
        'Error fetching users.',

      error:
        error.message
    });
  }
});

/* =========================================================
   CREATE USER
========================================================= */

router.post('/', async (req, res) => {

  try {

    const body = {
      ...req.body
    };

    // Validation
    if (
      !body.username ||
      !body.password ||
      !body.role
    ) {

      return res.status(400).json({

        message:
          'username, password and role are required.'
      });
    }

    body.username =
      body.username.trim();

    // Email validation
    if (
      body.email &&
      !EMAIL_RE.test(
        body.email
      )
    ) {

      return res.status(400).json({

        message:
          'Invalid email format.'
      });
    }

    // Duplicate check
    const existing =
      await User.findOne({

        username:
          body.username
      });

    if (existing) {

      return res.status(409).json({

        message:
          'Username already exists.'
      });
    }

    // Hash password
    body.password =
      await bcrypt.hash(
        body.password,
        10
      );

    const user =
      new User(body);

    const savedUser =
      await user.save();

    // SSE EVENT
    emitNoticeChanged({

      type:
        'user-created',

      username:
        savedUser.username
    });

    return res.status(201).json(

      sanitizeUser(savedUser)
    );

  } catch (error) {

    console.error(
      'Error creating user:',
      error
    );

    return res.status(500).json({

      message:
        'Error creating user.',

      error:
        error.message
    });
  }
});

/* =========================================================
   BULK CREATE / UPDATE USERS
========================================================= */

router.post('/bulk', async (req, res) => {

  try {

    const users =
      req.body.users || [];

    if (
      !Array.isArray(users) ||
      !users.length
    ) {

      return res.status(400).json({

        message:
          'No users provided.'
      });
    }

    let inserted = 0;

    let updated = 0;

    let skipped = 0;

    const errors = [];

    for (const raw of users) {

      try {

        const u = {
          ...raw
        };

        if (
          !u.username ||
          !u.password ||
          !u.role
        ) {

          skipped++;
          continue;
        }

        u.username =
          u.username.trim();

        const existing =
          await User.findOne({

            username:
              u.username
          });

        // UPDATE EXISTING
        if (existing) {

          const samePassword =
            await bcrypt.compare(
              u.password,
              existing.password
            );

          if (!samePassword) {

            u.password =
              await bcrypt.hash(
                u.password,
                10
              );
          }

          else {

            delete u.password;
          }

          await User.updateOne(

            {
              username:
                u.username
            },

            {
              $set: u
            }
          );

          updated++;
        }

        // CREATE NEW
        else {

          u.password =
            await bcrypt.hash(
              u.password,
              10
            );

          await new User(u)
            .save();

          inserted++;
        }

      } catch (err) {

        errors.push({

          user:
            raw.username,

          error:
            err.message
        });
      }
    }

    // SSE EVENT
    emitNoticeChanged({

      type:
        'users-bulk-uploaded',

      inserted,

      updated
    });

    return res.status(200).json({

      inserted,

      updated,

      skipped,

      errors
    });

  } catch (error) {

    console.error(
      'Bulk upload failed:',
      error
    );

    return res.status(500).json({

      message:
        'Bulk upload failed.',

      error:
        error.message
    });
  }
});

/* =========================================================
   GET PENDING USERS
========================================================= */

router.get(

  '/pending-users',

  async (req, res) => {

    try {

      const users =
        await User.find({

          isApproved: false
        })

          .select('-password')

          .sort({
            createdAt: -1
          });

      return res.status(200).json(
        users
      );

    } catch (error) {

      console.error(
        'Failed to fetch pending users:',
        error
      );

      return res.status(500).json({

        message:
          'Failed to fetch pending users.',

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   GET USERS BY APPROVAL STATUS
========================================================= */

router.get(

  '/isApproved/:status',

  async (req, res) => {

    try {

      const isApproved =
        req.params.status ===
        'true';

      const users =
        await User.find({

          isApproved
        })

          .select('-password');

      return res.status(200).json(
        users
      );

    } catch (error) {

      console.error(
        'Failed to fetch users:',
        error
      );

      return res.status(500).json({

        message:
          'Failed to fetch users.',

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   APPROVE USER
========================================================= */

router.put(

  '/approve-user/:id',

  async (req, res) => {

    try {

      const user =
        await User.findByIdAndUpdate(

          req.params.id,

          {
            isApproved: true
          },

          {
            new: true
          }
        );

      if (!user) {

        return res.status(404).json({

          message:
            'User not found.'
        });
      }

      // SSE EVENT
      emitNoticeChanged({

        type:
          'user-approved',

        username:
          user.username
      });

      return res.status(200).json({

        message:
          'User approved successfully.',

        user:
          sanitizeUser(user)
      });

    } catch (error) {

      console.error(
        'Failed to approve user:',
        error
      );

      return res.status(500).json({

        message:
          'Failed to approve user.',

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   UPDATE USER
========================================================= */

router.put('/:id', async (req, res) => {

  try {

    const updateData = {
      ...req.body
    };

    // Password hashing
    if (
      updateData.password
    ) {

      updateData.password =
        await bcrypt.hash(
          updateData.password,
          10
        );
    }

    // Email validation
    if (
      updateData.email &&
      !EMAIL_RE.test(
        updateData.email
      )
    ) {

      return res.status(400).json({

        message:
          'Invalid email format.'
      });
    }

    const updatedUser =
      await User.findByIdAndUpdate(

        req.params.id,

        {
          $set:
            updateData
        },

        {
          new: true,
          runValidators: true
        }
      );

    if (!updatedUser) {

      return res.status(404).json({

        message:
          'User not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type:
        'user-updated',

      username:
        updatedUser.username
    });

    return res.status(200).json(

      sanitizeUser(
        updatedUser
      )
    );

  } catch (error) {

    console.error(
      'Error updating user:',
      error
    );

    return res.status(500).json({

      message:
        'Error updating user.',

      error:
        error.message
    });
  }
});

/* =========================================================
   GET USER BY USERNAME
========================================================= */

router.get(

  '/by-username/:username',

  async (req, res) => {

    try {

      const user =
        await User.findOne({

          username:
            req.params.username
              .trim()
        })

          .select('-password');

      if (!user) {

        return res.status(404).json({

          message:
            'User not found.'
        });
      }

      return res.status(200).json(
        user
      );

    } catch (error) {

      console.error(
        'Error fetching user:',
        error
      );

      return res.status(500).json({

        message:
          'Error fetching user.',

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   DELETE USER
========================================================= */

router.delete('/:id', async (req, res) => {

  try {

    const deletedUser =
      await User.findByIdAndDelete(
        req.params.id
      );

    if (!deletedUser) {

      return res.status(404).json({

        message:
          'User not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type:
        'user-deleted',

      username:
        deletedUser.username
    });

    return res.status(200).json({

      message:
        'User deleted successfully.'
    });

  } catch (error) {

    console.error(
      'Error deleting user:',
      error
    );

    return res.status(500).json({

      message:
        'Error deleting user.',

      error:
        error.message
    });
  }
});

module.exports = router;