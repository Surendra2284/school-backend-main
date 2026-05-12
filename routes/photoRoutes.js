const express = require('express');
const sharp = require('sharp');
const multer = require('multer');

const router = express.Router();

const Photo = require('../models/Photo');
const { emitNoticeChanged } = require('../server');

/**
 * =========================================================
 * Multer Configuration
 * =========================================================
 */

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * =========================================================
 * Helper Function For Image Compression
 * =========================================================
 */

const processImage = async (buffer) => {

  return await sharp(buffer)
    .resize({
      width: 800,
      withoutEnlargement: true
    })
    .jpeg({
      quality: 70
    })
    .toBuffer();
};

/**
 * =========================================================
 * Add New Photo
 * =========================================================
 */

router.post('/add', upload.single('image'), async (req, res) => {

  try {

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: 'Image file is required!'
      });
    }

    const {
      name,
      setTheUsername,
      assignclass,
      Role = 'Admin'
    } = req.body;

    const resizedImageBuffer = await processImage(
      req.file.buffer
    );

    const photo = new Photo({
      name,
      Role,
      setTheUsername,
      assignclass,
      isApproved: false,
      image: resizedImageBuffer,
      contentType: 'image/jpeg'
    });

    await photo.save();

    // SSE EVENT
    emitNoticeChanged({
      type: 'photo-added',
      photoId: photo._id
    });

    res.status(201).json({
      message: 'Photo added successfully!',
      photo
    });

  } catch (error) {

    console.error('Error adding photo:', error);

    res.status(500).json({
      message: 'Error adding photo',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Update Photo
 * =========================================================
 */

router.put('/update/:id', upload.single('image'), async (req, res) => {

  try {

    const { id } = req.params;

    const updates = {};

    if (req.body.name) {
      updates.name = req.body.name;
    }

    if (req.body.setTheUsername) {
      updates.setTheUsername = req.body.setTheUsername;
    }

    if (req.body.assignclass) {
      updates.assignclass = req.body.assignclass;
    }

    if (req.body.Role) {
      updates.Role = req.body.Role;
    }

    if (typeof req.body.isApproved !== 'undefined') {
      updates.isApproved =
        req.body.isApproved === 'true' ||
        req.body.isApproved === true;
    }

    // Process image if uploaded
    if (req.file && req.file.buffer) {

      const resizedImageBuffer = await processImage(
        req.file.buffer
      );

      updates.image = resizedImageBuffer;
      updates.contentType = 'image/jpeg';
    }

    const updatedPhoto = await Photo.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!updatedPhoto) {
      return res.status(404).json({
        message: 'Photo not found!'
      });
    }

    // SSE EVENT
    emitNoticeChanged({
      type: 'photo-updated',
      photoId: updatedPhoto._id
    });

    res.status(200).json({
      message: 'Photo updated successfully!',
      updatedPhoto
    });

  } catch (error) {

    console.error('Error updating photo:', error);

    res.status(500).json({
      message: 'Error updating photo',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Delete Photo
 * =========================================================
 */

router.delete('/delete/:id', async (req, res) => {

  try {

    const { id } = req.params;

    const deletedPhoto = await Photo.findByIdAndDelete(id);

    if (!deletedPhoto) {
      return res.status(404).json({
        message: 'Photo not found!'
      });
    }

    // SSE EVENT
    emitNoticeChanged({
      type: 'photo-deleted',
      photoId: id
    });

    res.status(200).json({
      message: 'Photo deleted successfully!'
    });

  } catch (error) {

    console.error('Error deleting photo:', error);

    res.status(500).json({
      message: 'Error deleting photo',
      error: error.message
    });

  }
});

/**
 * =========================================================
 * Get All Photos
 * =========================================================
 */

router.get('/', async (req, res) => {

  try {

    const {
      role,
      includeAll
    } = req.query;

    const isAdminView = includeAll === 'true';

    const query = {};

    // Filter by role
    if (role && !isAdminView) {
      query.Role = role;
    }

    // Only approved for normal users
    if (!isAdminView) {
      query.isApproved = true;
    }

    const photos = await Photo.find(query);

    const formattedPhotos = photos
      .filter(photo => photo.image)
      .map(photo => ({

        _id: photo._id,

        name: photo.name,

        Role: photo.Role,

        isApproved: photo.isApproved,

        setTheUsername: photo.setTheUsername,

        assignclass: photo.assignclass,

        image:
          `data:${photo.contentType || 'image/jpeg'};base64,` +
          Buffer.from(photo.image).toString('base64')

      }));

    res.status(200).json(formattedPhotos);

  } catch (error) {

    console.error('Error fetching photos:', error);

    res.status(500).json({
      error: 'Error fetching photos',
      details: error.message
    });

  }
});

module.exports = router;