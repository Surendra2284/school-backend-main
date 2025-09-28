const mongoose = require('mongoose');
// Define Student Schema
const NoticeSchema = new mongoose.Schema({
  Noticeid: { type: String, required: true }, // Unique Student ID
  name: { type: String, required: true },
  class: { type: String, required: true },
  Role: { type: String, required: true },
  Notice: { type: String },
  classteacher : { type:String }// Store photo as binary data
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const notice = mongoose.model('Noticedata', NoticeSchema);
module.exports = notice;







