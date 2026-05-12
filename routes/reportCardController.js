const XLSX = require('xlsx');

const ReportCard =
  require('../models/ReportCard');

const { emitNoticeChanged } =
  require('../server');

/* =========================================================
   HELPERS
========================================================= */

// Convert value safely to number
const toNumber = (value) => {

  const num = Number(value);

  return Number.isNaN(num)
    ? 0
    : num;
};

// Calculate Grade
const calculateGrade = (percentage) => {

  if (percentage >= 90) return 'A+';

  if (percentage >= 75) return 'A';

  if (percentage >= 60) return 'B';

  if (percentage >= 45) return 'C';

  if (percentage >= 33) return 'D';

  return 'F';
};

// Calculate Result
const calculateResult = (percentage) => {

  return percentage >= 33
    ? 'PASS'
    : 'FAIL';
};

/* =========================================================
   CREATE REPORT CARD OBJECT
========================================================= */

const createReportCardData = (row) => {

  const subjects = [

    {
      subject: 'Math',
      marks: toNumber(row.Math)
    },

    {
      subject: 'Hindi',
      marks: toNumber(row.Hindi)
    },

    {
      subject: 'EVS',
      marks: toNumber(row.EVS)
    },

    {
      subject: 'Drawing',
      marks: toNumber(row.Drawing)
    },

    {
      subject: 'Game',
      marks: toNumber(row.Game)
    },

    {
      subject: 'Extra',
      marks: toNumber(row.Extra)
    },

    {
      subject: 'ComputerScience',
      marks: toNumber(
        row.ComputerScience
      )
    },

    {
      subject: 'English',
      marks: toNumber(row.English)
    }
  ];

  // Calculate totals
  const total = subjects.reduce(

    (sum, subject) =>
      sum + subject.marks,

    0
  );

  const maxMarks =
    subjects.length * 100;

  const percentage =
    Number(
      ((total / maxMarks) * 100)
      .toFixed(2)
    );

  return {

    studentId: row.studentId,

    class: row.class,

    section: row.section || '',

    rollNo: row.rollNo || '',

    studentName:
      row.studentName || '',

    examName:
      row.examName || 'Final Exam',

    session:
      row.session || '',

    marks: subjects,

    total,

    maxMarks,

    percentage,

    grade:
      calculateGrade(percentage),

    result:
      calculateResult(percentage),

    remarks:
      row.remarks || ''
  };
};

/* =========================================================
   UPLOAD REPORT CARD EXCEL
========================================================= */

exports.uploadMarksExcel =
  async (req, res) => {

    try {

      if (
        !req.file ||
        !req.file.buffer
      ) {

        return res.status(400).json({

          message:
            'Excel file is required.'
        });
      }

      // Read workbook
      const workbook =
        XLSX.read(req.file.buffer);

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          sheet
        );

      if (!rows.length) {

        return res.status(400).json({

          message:
            'Excel file is empty.'
        });
      }

      const savedRecords = [];

      for (const row of rows) {

        const reportCardData =
          createReportCardData(row);

        // Upsert report card
        const reportCard =
          await ReportCard.findOneAndUpdate(

            {
              studentId:
                reportCardData.studentId,

              examName:
                reportCardData.examName,

              session:
                reportCardData.session
            },

            reportCardData,

            {
              new: true,
              upsert: true
            }
          );

        savedRecords.push(
          reportCard
        );
      }

      // SSE EVENT
      emitNoticeChanged({

        type:
          'report-card-uploaded',

        totalStudents:
          savedRecords.length
      });

      return res.status(200).json({

        message:
          'Report cards uploaded successfully.',

        total:
          savedRecords.length,

        data: savedRecords
      });

    } catch (err) {

      console.error(
        'Error uploading report cards:',
        err
      );

      return res.status(500).json({

        error: err.message
      });
    }
  };

/* =========================================================
   CREATE SINGLE REPORT CARD
========================================================= */

exports.createReportCard =
  async (req, res) => {

    try {

      const reportCardData =
        createReportCardData(
          req.body
        );

      const reportCard =
        new ReportCard(
          reportCardData
        );

      await reportCard.save();

      // SSE EVENT
      emitNoticeChanged({

        type:
          'report-card-created',

        studentId:
          reportCard.studentId
      });

      return res.status(201).json({

        message:
          'Report card created successfully.',

        reportCard
      });

    } catch (err) {

      console.error(
        'Error creating report card:',
        err
      );

      return res.status(500).json({

        error: err.message
      });
    }
  };

/* =========================================================
   GET ALL REPORT CARDS
========================================================= */

exports.getReportCards =
  async (req, res) => {

    try {

      const reportCards =
        await ReportCard.find()

          .sort({
            createdAt: -1
          });

      return res.status(200).json(
        reportCards
      );

    } catch (err) {

      console.error(
        'Error fetching report cards:',
        err
      );

      return res.status(500).json({

        error: err.message
      });
    }
  };

/* =========================================================
   GET REPORT CARD BY ID
========================================================= */

exports.getReportCardById =
  async (req, res) => {

    try {

      const reportCard =
        await ReportCard.findById(
          req.params.id
        );

      if (!reportCard) {

        return res.status(404).json({

          message:
            'Report card not found.'
        });
      }

      return res.status(200).json(
        reportCard
      );

    } catch (err) {

      console.error(
        'Error fetching report card:',
        err
      );

      return res.status(500).json({

        error: err.message
      });
    }
  };

/* =========================================================
   GET REPORT CARD BY STUDENT ID
========================================================= */

exports.getReportCardByStudent =
  async (req, res) => {

    try {

      const reportCards =
        await ReportCard.find({

          studentId:
            req.params.studentId
        })

          .sort({
            createdAt: -1
          });

      return res.status(200).json(
        reportCards
      );

    } catch (err) {

      console.error(
        'Error fetching student report cards:',
        err
      );

      return res.status(500).json({

        error: err.message
      });
    }
  };

/* =========================================================
   UPDATE REPORT CARD
========================================================= */

exports.updateReportCard =
  async (req, res) => {

    try {

      const reportCardData =
        createReportCardData(
          req.body
        );

      const updated =
        await ReportCard.findByIdAndUpdate(

          req.params.id,

          reportCardData,

          {
            new: true,
            runValidators: true
          }
        );

      if (!updated) {

        return res.status(404).json({

          message:
            'Report card not found.'
        });
      }

      // SSE EVENT
      emitNoticeChanged({

        type:
          'report-card-updated',

        reportCardId:
          updated._id
      });

      return res.status(200).json({

        message:
          'Report card updated successfully.',

        reportCard: updated
      });

    } catch (err) {

      console.error(
        'Error updating report card:',
        err
      );

      return res.status(500).json({

        error: err.message
      });
    }
  };

/* =========================================================
   DELETE REPORT CARD
========================================================= */

exports.deleteReportCard =
  async (req, res) => {

    try {

      const deleted =
        await ReportCard.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {

        return res.status(404).json({

          message:
            'Report card not found.'
        });
      }

      // SSE EVENT
      emitNoticeChanged({

        type:
          'report-card-deleted',

        reportCardId:
          req.params.id
      });

      return res.status(200).json({

        message:
          'Report card deleted successfully.'
      });

    } catch (err) {

      console.error(
        'Error deleting report card:',
        err
      );

      return res.status(500).json({

        error: err.message
      });
    }
  };