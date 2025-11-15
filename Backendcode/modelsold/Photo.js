const mongoose = require('mongoose');

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
  }
});

module.exports = mongoose.model('Photo', photoSchema);