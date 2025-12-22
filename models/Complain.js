const mongoose = require('mongoose');

const ComplainSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },        // student/teacher username
    userId:   { type: String, required: true },        // studentId or userId
    class:    { type: String, required: true },

    role: { 
      type: String,
      enum: ['Student', 'Teacher', 'Parent'],
      required: true
    },

    transportUsing: { type: Boolean, default: false },
    busRoute: { type: String, default: '' },

    Notice: { type: String, required: true },          // complaint text
    dated:  { type: Date, default: Date.now },

    resolved: { type: Boolean, default: false },
    resolveDate: { type: Date },

    remark: { type: String, default: '' },             // admin/teacher reply

    photoFromUser: { type: String, default: '' },      // complaint image
    photoForReply: { type: String, default: '' }       // reply image
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complain', ComplainSchema);
