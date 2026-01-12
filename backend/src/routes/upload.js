
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const auth = require('../lib/authMiddleware');

const router = express.Router();

// Configure storage
// Configure memory storage for Render compatibility (DB persistence)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB limit (fits in TEXT column with overhead)
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports images!"));
    }
});

const storageService = require('../services/storageService');

// POST /api/upload/avatar - Upload profile picture
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
    console.log(`[Upload] Avatar upload request for user: ${req.user.userId}`);
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload to Cloud Storage
        const publicUrl = await storageService.uploadFile(req.file, 'avatars');

        if (!publicUrl) {
            return res.status(500).json({ error: 'Cloud storage upload failed' });
        }

        // Update user profile with persistent data
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { avatarUrl: publicUrl }
        });

        res.json({ message: 'Avatar uploaded successfully', avatarUrl: publicUrl });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

module.exports = router;

