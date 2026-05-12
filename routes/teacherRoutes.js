const express = require('express');

const router = express.Router();

const Teacher = require('../models/Teacher');

const { emitNoticeChanged } =
  require('../server');

/* =========================================================
   HELPERS
========================================================= */

const MOBILE_RE =
  /^[6-9]\d{9}$/;

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =========================================================
   FORMAT TEACHER RESPONSE
========================================================= */

const formatTeacher = (teacher) => {

  const obj = teacher.toObject();

  return {

    ...obj,

    teacherid:
      teacher.teacherid ||
      teacher._id.toString()
  };
};

/* =========================================================
   GET ALL TEACHERS
========================================================= */

router.get('/', async (req, res) => {

  try {

    const {
      name,
      subject,
      Assignclass,
      limit = 100,
      skip = 0
    } = req.query;

    const query = {};

    // Search by name
    if (name) {

      query.name = {

        $regex: name,

        $options: 'i'
      };
    }

    // Search by subject
    if (subject) {

      query.subject = {

        $regex: subject,

        $options: 'i'
      };
    }

    // Search by class
    if (Assignclass) {

      query.Assignclass =
        Assignclass;
    }

    const teachers =
      await Teacher.find(query)

        .limit(Number(limit))

        .skip(Number(skip))

        .sort({
          createdAt: -1
        });

    const formatted =
      teachers.map(formatTeacher);

    return res.status(200).json({

      total:
        formatted.length,

      teachers: formatted
    });

  } catch (error) {

    console.error(
      'Error fetching teachers:',
      error
    );

    return res.status(500).json({

      message:
        'Failed to fetch teachers.',

      error: error.message
    });
  }
});

/* =========================================================
   GET TEACHER BY ID
========================================================= */

router.get('/id/:id', async (req, res) => {

  try {

    const teacher =
      await Teacher.findById(
        req.params.id
      );

    if (!teacher) {

      return res.status(404).json({

        message:
          'Teacher not found.'
      });
    }

    return res.status(200).json(
      formatTeacher(teacher)
    );

  } catch (error) {

    console.error(
      'Error fetching teacher:',
      error
    );

    return res.status(500).json({

      message:
        'Failed to fetch teacher.',

      error: error.message
    });
  }
});

/* =========================================================
   GET TEACHER BY USERNAME / NAME
========================================================= */

router.get(
  '/username/:username',

  async (req, res) => {

    try {

      const teacher =
        await Teacher.findOne({

          name: {

            $regex:
              `^${req.params.username}$`,

            $options: 'i'
          }
        });

      if (!teacher) {

        return res.status(404).json({

          message:
            'Teacher not found.'
        });
      }

      return res.status(200).json(
        formatTeacher(teacher)
      );

    } catch (error) {

      console.error(
        'Error fetching teacher by username:',
        error
      );

      return res.status(500).json({

        message:
          'Failed to fetch teacher.',

        error: error.message
      });
    }
  }
);

/* =========================================================
   ADD NEW TEACHER
========================================================= */

router.post('/', async (req, res) => {

  try {

    const {

      teacherid,

      name,

      Assignclass,

      mobileNo,

      address,

      Email,

      subject

    } = req.body;

    // Validation
    if (
      !name ||
      !Assignclass ||
      !mobileNo ||
      !Email ||
      !subject
    ) {

      return res.status(400).json({

        message:
          'Required fields are missing.'
      });
    }

    // Mobile validation
    if (
      !MOBILE_RE.test(
        String(mobileNo)
      )
    ) {

      return res.status(400).json({

        message:
          'Invalid mobile number.'
      });
    }

    // Email validation
    if (
      !EMAIL_RE.test(
        String(Email)
      )
    ) {

      return res.status(400).json({

        message:
          'Invalid email address.'
      });
    }

    // Check duplicate teacherid
    if (teacherid) {

      const exists =
        await Teacher.findOne({

          teacherid
        });

      if (exists) {

        return res.status(409).json({

          message:
            'Teacher ID already exists.'
        });
      }
    }

    const newTeacher =
      new Teacher(req.body);

    await newTeacher.save();

    // SSE EVENT
    emitNoticeChanged({

      type:
        'teacher-added',

      teacherId:
        newTeacher.teacherid ||

        newTeacher._id
    });

    return res.status(201).json({

      message:
        'Teacher added successfully.',

      teacher:
        formatTeacher(
          newTeacher
        )
    });

  } catch (error) {

    console.error(
      'Error adding teacher:',
      error
    );

    return res.status(500).json({

      message:
        'Failed to add teacher.',

      error: error.message
    });
  }
});

/* =========================================================
   UPDATE TEACHER
========================================================= */

router.put('/:id', async (req, res) => {

  try {

    // Email validation
    if (
      req.body.Email &&
      !EMAIL_RE.test(
        String(req.body.Email)
      )
    ) {

      return res.status(400).json({

        message:
          'Invalid email address.'
      });
    }

    // Mobile validation
    if (
      req.body.mobileNo &&
      !MOBILE_RE.test(
        String(req.body.mobileNo)
      )
    ) {

      return res.status(400).json({

        message:
          'Invalid mobile number.'
      });
    }

    const updatedTeacher =
      await Teacher.findByIdAndUpdate(

        req.params.id,

        req.body,

        {
          new: true,
          runValidators: true
        }
      );

    if (!updatedTeacher) {

      return res.status(404).json({

        message:
          'Teacher not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type:
        'teacher-updated',

      teacherId:
        updatedTeacher.teacherid ||

        updatedTeacher._id
    });

    return res.status(200).json({

      message:
        'Teacher updated successfully.',

      teacher:
        formatTeacher(
          updatedTeacher
        )
    });

  } catch (error) {

    console.error(
      'Error updating teacher:',
      error
    );

    return res.status(500).json({

      message:
        'Failed to update teacher.',

      error: error.message
    });
  }
});

/* =========================================================
   DELETE TEACHER
========================================================= */

router.delete('/:id', async (req, res) => {

  try {

    const teacher =
      await Teacher.findByIdAndDelete(
        req.params.id
      );

    if (!teacher) {

      return res.status(404).json({

        message:
          'Teacher not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type:
        'teacher-deleted',

      teacherId:
        teacher.teacherid ||

        req.params.id
    });

    return res.status(200).json({

      message:
        'Teacher deleted successfully.'
    });

  } catch (error) {

    console.error(
      'Error deleting teacher:',
      error
    );

    return res.status(500).json({

      message:
        'Failed to delete teacher.',

      error: error.message
    });
  }
});

module.exports = router;