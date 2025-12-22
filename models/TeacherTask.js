const mongoose = require('mongoose');

const teacherTaskSchema = new mongoose.Schema(
  {
    taskCreateDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    taskForUser: {
      type: String,
      required: true   // teacher username / teacherid
    },

    class: {
      type: String,
      required: true
    },

    taskGivenBy: {
      type: String,
      required: true   // admin / principal name
    },

    updatedOn: {
      type: Date
    },

    taskDescription: {
      type: String,
      required: true
    },

    completedOn: {
      type: Date
    },

    delayReason: {
      type: String
    },

    replyDate: {
      type: Date
    },

    complainResolve: {
      type: Boolean,
      default: false
    },

    other: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TeacherTask', teacherTaskSchema);
