const express = require('express');

const multer = require('multer');

const XLSX = require('xlsx');

const Teacher = require('../models/Teacher');

const { emitNoticeChanged } =
  require('../server');

const router = express.Router();

/* =========================================================
   MULTER CONFIG
========================================================= */

const upload = multer({

  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/* =========================================================
   HELPERS
========================================================= */

const MOBILE_RE =
  /^[6-9]\d{9}$/;

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =========================================================
   BULK TEACHER IMPORT
========================================================= */

router.post(

  '/teachers/import',

  upload.single('file'),

  async (req, res) => {

    try {

      // Validate file
      if (!req.file) {

        return res.status(400).json({

          message:
            'No Excel file uploaded.'
        });
      }

      // Read workbook
      const workbook =
        XLSX.read(req.file.buffer, {

          type: 'buffer'
        });

      const sheetName =
        workbook.SheetNames[0];

      const sheet =
        workbook.Sheets[sheetName];

      const rows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: ''
          }
        );

      if (!rows.length) {

        return res.status(400).json({

          message:
            'Excel file is empty.'
        });
      }

      const docs = [];

      const errors = [];

      const seenTeacherIds =
        new Set();

      rows.forEach((row, index) => {

        const rowNumber =
          index + 2;

        const teacher = {

          teacherid: String(

            row.teacherid ||

            row.TeacherID ||

            `T${rowNumber}`

          ).trim(),

          name: String(

            row.name ||

            row.Name ||

            ''

          ).trim(),

          Assignclass: String(

            row.Assignclass ||

            row.Class ||

            ''

          ).trim(),

          mobileNo: String(

            row.mobileNo ||

            row.Mobile ||

            ''

          ).trim(),

          address: String(

            row.address ||

            row.Address ||

            ''

          ).trim(),

          Role: String(

            row.Role ||

            'Teacher'

          ).trim(),

          Notice: String(

            row.Notice || ''
          ).trim(),

          Email: String(

            row.Email ||

            row.email ||

            ''

          ).trim(),

          attendance: Number(
            row.attendance ?? 0
          ),

          photo: Buffer.alloc(0),

          classteacher: String(

            row.classteacher ||

            row.ClassTeacher ||

            ''

          ).trim(),

          subject: String(

            row.subject ||

            row.Subject ||

            ''

          ).trim(),

          experience: Number(
            row.experience ?? 0
          )
        };

        /* =========================
           VALIDATION
        ========================= */

        if (!teacher.teacherid) {

          errors.push({

            row: rowNumber,

            error:
              'Teacher ID is required.'
          });
        }

        if (!teacher.name) {

          errors.push({

            row: rowNumber,

            error:
              'Teacher name is required.'
          });
        }

        if (!teacher.Assignclass) {

          errors.push({

            row: rowNumber,

            error:
              'Assignclass is required.'
          });
        }

        if (
          !teacher.mobileNo ||

          !MOBILE_RE.test(
            teacher.mobileNo
          )
        ) {

          errors.push({

            row: rowNumber,

            error:
              'Invalid mobile number.'
          });
        }

        if (
          !teacher.Email ||

          !EMAIL_RE.test(
            teacher.Email
          )
        ) {

          errors.push({

            row: rowNumber,

            error:
              'Invalid email.'
          });
        }

        if (!teacher.subject) {

          errors.push({

            row: rowNumber,

            error:
              'Subject is required.'
          });
        }

        // Duplicate teacherid in same file
        if (
          seenTeacherIds.has(
            teacher.teacherid
          )
        ) {

          errors.push({

            row: rowNumber,

            error:
              `Duplicate Teacher ID: ${teacher.teacherid}`
          });
        }

        seenTeacherIds.add(
          teacher.teacherid
        );

        docs.push(teacher);
      });

      // Stop if validation errors
      if (errors.length) {

        return res.status(422).json({

          message:
            'Validation errors found.',

          errors
        });
      }

      /* =========================
         CHECK EXISTING TEACHERS
      ========================= */

      const ids = docs.map(
        t => t.teacherid
      );

      const existing =
        await Teacher.find({

          teacherid: {
            $in: ids
          }
        })
          .select('teacherid')
          .lean();

      const existingIds =
        new Set(
          existing.map(
            t => t.teacherid
          )
        );

      const newDocs =
        docs.filter(
          t =>
            !existingIds.has(
              t.teacherid
            )
        );

      const skipped =
        docs.length -
        newDocs.length;

      if (!newDocs.length) {

        return res.status(400).json({

          message:
            'All teachers already exist.',

          skipped
        });
      }

      /* =========================
         INSERT
      ========================= */

      const insertedDocs =
        await Teacher.insertMany(
          newDocs,
          {
            ordered: false
          }
        );

      // SSE EVENT
      emitNoticeChanged({

        type:
          'teachers-imported',

        inserted:
          insertedDocs.length,

        skipped
      });

      return res.status(200).json({

        message:
          'Teachers imported successfully.',

        inserted:
          insertedDocs.length,

        skipped,

        total:
          docs.length
      });

    } catch (err) {

      console.error(
        'Bulk teacher import error:',
        err
      );

      return res.status(500).json({

        message:
          'Bulk import failed.',

        error: err.message
      });
    }
  }
);

module.exports = router;