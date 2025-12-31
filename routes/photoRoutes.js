const express = require('express');
const sharp = require('sharp');
const Photo = require('../models/Photo');
const multer = require('multer');
const { setTheUsername } = require('whatwg-url');

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

    const { name,setTheUsername,assignclass,Role = 'Admin' } = req.body;

    // Resize and compress image using sharp
    const resizedImageBuffer = await sharp(req.file.buffer)
      .toFormat("jpeg") // Ensure compatibility
      .resize({ width: 800 }) // Resize width to 800px (adjust as needed)
      .jpeg({ quality: 70 }) // Compress JPEG quality to 70%
      .toBuffer();

    const photo = new Photo({
      name,
      Role,
      setTheUsername,
      assignclass,
      isApproved: false,   // default pending
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
    const updates = {};

    if (req.body.name) updates.name = req.body.name;
    if (req.body.setTheUsername) updates.setTheUsername = req.body.setTheUsername;
    if (req.body.assignclass) updates.assignclass = req.body.assignclass;
    if (req.body.Role) updates.Role = req.body.Role;
    if (typeof req.body.isApproved !== 'undefined') {
      updates.isApproved = req.body.isApproved === 'true' || req.body.isApproved === true;
    }

    if (req.file && req.file.buffer && req.file.buffer.length > 0) {
      const resizedImageBuffer = await sharp(req.file.buffer)
        .toFormat("jpeg")
        .resize({ width: 800 })
        .jpeg({ quality: 70 })
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
    const { role, includeAll } = req.query;
    const isAdminView = includeAll === 'true';

    const query = {};
    if (role && !isAdminView) query.Role = role;  // Admin ignores role
    if (!isAdminView) query.isApproved = true;    // Only non-admin filters approved

    const photos = await Photo.find(query);

    // Admin: skip image validation to show all (including pending)
    const validPhotos = isAdminView 
      ? photos.filter(photo => photo.image)  // Less strict for Admin
      : photos.filter(photo => photo.image && photo.image.length > 0);

    const formattedPhotos = validPhotos.map(photo => ({
      _id: photo._id,
      name: photo.name,
      image: `data:${photo.contentType || 'image/jpeg'};base64,${Buffer.from(photo.image).toString('base64')}`,
      Role: photo.Role,
      isApproved: photo.isApproved,
      setTheUsername: photo.setTheUsername,
      assignclass: photo.assignclass  
    }));

    res.json(formattedPhotos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching photos' });
  }
});


module.exports = router;