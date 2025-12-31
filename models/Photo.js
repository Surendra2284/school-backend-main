const mongoose = require('mongoose');
const { setTheUsername } = require('whatwg-url');

const photoSchema = new mongoose.Schema({
  name: {
    type: String, // Name of the photo
    required: true
  },
  image: {
    type: Buffer, // Binary data of the image
    required: true
  },
  contentType: {
    type: String, // MIME type of the image (e.g., 'image/jpeg')
    required: true
  },
  Role: {
    type: String, //For Selection of photos
    required: false,
    default: 'Admin'
  },
  assignclass: {
    type: String, //For Selection of photos
    required: false,
    default: 'All'
  },
  setTheUsername: {
    type: String, //For Selection of photos
    required: false,
    default: 'All'
  },
  isApproved: { type: Boolean, default: false }
});

module.exports = mongoose.model('Photo', photoSchema);