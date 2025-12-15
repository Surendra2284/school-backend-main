const XLSX = require('xlsx');
const ReportCard = require('../models/ReportCard');

exports.uploadMarksExcel = async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    for (let row of rows) {
      const total = row.Math + row.Science + row.English;
      const percentage = total / 8;

      await ReportCard.create({
        studentId: row.studentId,
        class: row.class,
        studentName: row.studentName,
        marks: [
          { subject: 'Math', marks: row.Math },
          { subject: 'Hindi', marks: row.Hindi },
          { subject: 'EVS', marks: row.EVS },
          { subject: 'Drawing', marks: row.Drawing },
          { subject: 'Game', marks: row.Game},
          { subject: 'Extra', marks: row.extra },
          { subject: 'ComputerScience', marks: row.ComputerScience },
          { subject: 'English', marks: row.English }
        ],
        total,
        percentage,
        grade: percentage >= 60 ? 'A' : 'B'
      });
    }

    res.json({ message: 'Report Cards Uploaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
