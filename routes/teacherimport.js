const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const Teacher = require('../models/Teacher'); // your schema file

const router = express.Router();

// store file in memory (no disk file needed)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/teachers/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // read workbook from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: ''
    });

    // map rows → Teacher docs (minimum required fields)
    const docs = rows.map((row, i) => ({
      teacherid: String(row.teacherid || row.TeacherID || `T${i + 1}`),
      name: row.name || row.Name,
      Assignclass: row.Assignclass || row.Class,
      mobileNo: String(row.mobileNo || row.Mobile || ''),
      address: row.address || row.Address,
      Role: row.Role || 'Teacher',
      Notice: row.Notice || '',
      Email: row.Email || row.email,
      attendance: Number(row.attendance ?? 0),
      // for bulk import, start without photo (make it NOT required or default)
      photo: Buffer.alloc(0),
      classteacher: row.classteacher || row.ClassTeacher || '',
      subject: row.subject || row.Subject,
      experience: Number(row.experience ?? 0),
    }));

    // filter out clearly invalid rows
    const validDocs = docs.filter(d =>
      d.teacherid &&
      d.name &&
      d.Assignclass &&
      d.mobileNo &&
      d.address &&
      d.Role &&
      d.Email &&
      d.classteacher &&
      d.subject
    );

    if (!validDocs.length) {
      return res.status(400).json({ message: 'No valid rows found' });
    }

    const result = await Teacher.insertMany(validDocs);
    res.json({ inserted: result.length });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ message: 'Bulk import failed', error: err.message });
  }
});

module.exports = router;
