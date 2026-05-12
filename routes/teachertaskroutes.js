const express = require('express');

const router = express.Router();

const TeacherTask =
  require('../models/TeacherTask');

const { emitNoticeChanged } =
  require('../server');

/* =========================================================
   HELPERS
========================================================= */

const normalizeDate = (date) => {

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d;
};

/* =========================================================
   ADD TASK
========================================================= */

router.post('/add', async (req, res) => {

  try {

    const {

      taskTitle,

      taskDescription,

      taskForUser,

      taskCreateDate

    } = req.body;

    // Validation
    if (
      !taskTitle ||
      !taskForUser
    ) {

      return res.status(400).json({

        message:
          'taskTitle and taskForUser are required.'
      });
    }

    const task =
      new TeacherTask({

        ...req.body,

        taskCreateDate:
          taskCreateDate ||
          new Date(),

        updatedOn:
          new Date()
      });

    await task.save();

    // SSE EVENT
    emitNoticeChanged({

      type:
        'teacher-task-added',

      taskId:
        task._id,

      taskForUser:
        task.taskForUser
    });

    return res.status(201).json({

      message:
        'Task created successfully.',

      task
    });

  } catch (err) {

    console.error(
      'Error creating task:',
      err
    );

    return res.status(400).json({

      message:
        'Error creating task.',

      error:
        err.message
    });
  }
});

/* =========================================================
   GET ALL TASKS
========================================================= */

router.get('/all', async (req, res) => {

  try {

    const {

      page = 1,

      limit = 100

    } = req.query;

    const skip =
      (Number(page) - 1) *
      Number(limit);

    const total =
      await TeacherTask.countDocuments();

    const tasks =
      await TeacherTask.find()

        .sort({
          createdAt: -1
        })

        .skip(skip)

        .limit(Number(limit));

    return res.status(200).json({

      total,

      page:
        Number(page),

      limit:
        Number(limit),

      tasks
    });

  } catch (err) {

    console.error(
      'Error fetching tasks:',
      err
    );

    return res.status(500).json({

      error:
        err.message
    });
  }
});

/* =========================================================
   SEARCH TASKS BY USER
========================================================= */

router.get(

  '/by-user/:username',

  async (req, res) => {

    try {

      const tasks =
        await TeacherTask.find({

          taskForUser: {

            $regex:
              `^${req.params.username}$`,

            $options: 'i'
          }
        })

          .sort({
            createdAt: -1
          });

      return res.status(200).json(
        tasks
      );

    } catch (err) {

      console.error(
        'Error fetching tasks by user:',
        err
      );

      return res.status(500).json({

        error:
          err.message
      });
    }
  }
);

/* =========================================================
   SEARCH BY SINGLE DATE
========================================================= */

router.get(

  '/by-date/:date',

  async (req, res) => {

    try {

      const date =
        normalizeDate(
          req.params.date
        );

      if (!date) {

        return res.status(400).json({

          message:
            'Invalid date.'
        });
      }

      const nextDay =
        new Date(date);

      nextDay.setDate(
        date.getDate() + 1
      );

      const tasks =
        await TeacherTask.find({

          taskCreateDate: {

            $gte: date,

            $lt: nextDay
          }
        })

          .sort({
            createdAt: -1
          });

      return res.status(200).json(
        tasks
      );

    } catch (err) {

      console.error(
        'Error fetching tasks by date:',
        err
      );

      return res.status(400).json({

        error:
          err.message
      });
    }
  }
);

/* =========================================================
   SEARCH BY DATE RANGE
========================================================= */

router.get(

  '/by-date-range',

  async (req, res) => {

    try {

      const {

        startDate,

        endDate

      } = req.query;

      const start =
        normalizeDate(
          startDate
        );

      const end =
        normalizeDate(
          endDate
        );

      if (
        !start ||
        !end
      ) {

        return res.status(400).json({

          message:
            'Invalid startDate or endDate.'
        });
      }

      const tasks =
        await TeacherTask.find({

          taskCreateDate: {

            $gte: start,

            $lte: end
          }
        })

          .sort({
            createdAt: -1
          });

      return res.status(200).json(
        tasks
      );

    } catch (err) {

      console.error(
        'Error fetching tasks by date range:',
        err
      );

      return res.status(400).json({

        error:
          err.message
      });
    }
  }
);

/* =========================================================
   UPDATE FULL TASK
========================================================= */

router.put(

  '/update/:id',

  async (req, res) => {

    try {

      const updatedTask =
        await TeacherTask.findByIdAndUpdate(

          req.params.id,

          {

            ...req.body,

            updatedOn:
              new Date()
          },

          {
            new: true,

            runValidators: true
          }
        );

      if (!updatedTask) {

        return res.status(404).json({

          message:
            'Task not found.'
        });
      }

      // SSE EVENT
      emitNoticeChanged({

        type:
          'teacher-task-updated',

        taskId:
          updatedTask._id,

        taskForUser:
          updatedTask.taskForUser
      });

      return res.status(200).json({

        message:
          'Task updated successfully.',

        task:
          updatedTask
      });

    } catch (err) {

      console.error(
        'Error updating task:',
        err
      );

      return res.status(400).json({

        error:
          err.message
      });
    }
  }
);

/* =========================================================
   UPDATE ONLY UPDATEDON
========================================================= */

router.patch(

  '/update-updatedon/:id',

  async (req, res) => {

    try {

      const task =
        await TeacherTask.findByIdAndUpdate(

          req.params.id,

          {
            updatedOn:
              new Date()
          },

          {
            new: true
          }
        );

      if (!task) {

        return res.status(404).json({

          message:
            'Task not found.'
        });
      }

      // SSE EVENT
      emitNoticeChanged({

        type:
          'teacher-task-touch-updated',

        taskId:
          task._id
      });

      return res.status(200).json({

        message:
          'updatedOn refreshed successfully.',

        task
      });

    } catch (err) {

      console.error(
        'Error updating updatedOn:',
        err
      );

      return res.status(400).json({

        error:
          err.message
      });
    }
  }
);

/* =========================================================
   DELETE TASK
========================================================= */

router.delete(

  '/delete/:id',

  async (req, res) => {

    try {

      const deleted =
        await TeacherTask.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {

        return res.status(404).json({

          message:
            'Task not found.'
        });
      }

      // SSE EVENT
      emitNoticeChanged({

        type:
          'teacher-task-deleted',

        taskId:
          req.params.id
      });

      return res.status(200).json({

        message:
          'Task deleted successfully.'
      });

    } catch (err) {

      console.error(
        'Error deleting task:',
        err
      );

      return res.status(500).json({

        error:
          err.message
      });
    }
  }
);

module.exports = router;