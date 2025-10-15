const mongoose = require('mongoose');
// Define Student Schema
const studentSchema = new mongoose.Schema({
  studentId: { type: Number, required: true }, // Unique Student ID
  name: { type: String, required: true },
  class: { type: String, required: true },
  mobileNo: { type: String, required: true, match: /^[6-9]\d{9}$/ }, // Valid mobile number
  address: { type: String, required: true },
  Role: { type: String, required: true },
  Notice: { type: String },
  Email: { type: String , required: true },
 attendance: { type: Number, required: true },   // ✅ percentage
  photo: { type: String },         
  classteacher : { type:String }// Store photo as binary data
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;