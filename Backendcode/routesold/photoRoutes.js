const express = require('express');
const sharp = require('sharp');
const Photo = require('../models/Photo');
const multer = require('multer');

const router = express.Router();

// Multer setup for memory storage and file type filtering
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format!"), false);
  }
};

const upload = multer({ storage, fileFilter });

// Add a new photo
router.post('/add', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ message: 'Invalid image buffer or unsupported format!' });
    }

    const { name } = req.body;

    // Resize and compress image using sharp
    const resizedImageBuffer = await sharp(req.file.buffer)
      .toFormat("jpeg") // Ensure compatibility
      .resize({ width: 800 }) // Resize width to 800px (adjust as needed)
      .jpeg({ quality: 70 }) // Compress JPEG quality to 70%
      .toBuffer();

    const photo = new Photo({
      name,
      image: resizedImageBuffer,
      contentType: 'image/jpeg'
    });

    await photo.save();
    res.status(201).json({ message: 'Photo added successfully!', photo });
  } catch (error) {
    console.error('Error adding photo:', error);
    res.status(500).json({ message: 'Error adding photo', error });
  }
});

// Update a photo
router.put('/update/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { name: req.body.name };

    if (req.file && req.file.buffer && req.file.buffer.length > 0) {
      // Process new image with sharp before saving
      const resizedImageBuffer = await sharp(req.file.buffer)
        .toFormat("jpeg") // Ensure format compatibility
        .resize({ width: 800 }) // Resize width to 800px
        .jpeg({ quality: 70 }) // Compress image quality to 70%
        .toBuffer();

      updates.image = resizedImageBuffer;
      updates.contentType = 'image/jpeg';
    }

    const updatedPhoto = await Photo.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedPhoto) {
      return res.status(404).json({ message: 'Photo not found!' });
    }

    res.status(200).json({ message: 'Photo updated successfully!', updatedPhoto });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ message: 'Error updating photo', error });
  }
});

// Delete a photo
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPhoto = await Photo.findByIdAndDelete(id);

    if (!deletedPhoto) {
      return res.status(404).json({ message: 'Photo not found!' });
    }

    res.status(200).json({ message: 'Photo deleted successfully!' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ message: 'Error deleting photo', error });
  }
});

// Get all photos
router.get('/', async (req, res) => {
  try {
    const photos = await Photo.find();

    const formattedPhotos = photos
      .filter(photo => photo.image && photo.image.length > 0)
      .map(photo => {
        const base64Image = Buffer.from(photo.image).toString('base64');
        const mimeType = photo.contentType || 'image/jpeg';

        return {
          _id: photo._id,
          name: photo.name,
          image: `data:${mimeType};base64,${base64Image}`
        };
      });

    res.json(formattedPhotos);
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).json({ error: 'Error fetching photos' });
  }
});

module.exports = router;