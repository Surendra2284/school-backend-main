const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  age: Number,
  class: String,
  address: String,
  photo: String // Add photo field to the schema
});

module.exports = mongoose.model('Student', studentSchema);
