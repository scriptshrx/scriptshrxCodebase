const fs = require('fs');
const path = require('path');
const storageService = require('../src/services/storageService');
const prisma = require('../src/lib/prisma');

async function migrate() {
    console.log('--- Migrating local assets to Supabase Storage ---');

    const uploadsDir = path.resolve(__dirname, '../src/uploads');

    if (!fs.existsSync(uploadsDir)) {
        console.log('No uploads directory found.');
        return;
    }

    const files = fs.readdirSync(uploadsDir);
    console.log(`Found ${files.length} files to migrate.`);

    for (const fileName of files) {
        if (fileName === '.gitkeep') continue;

        const filePath = path.join(uploadsDir, fileName);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) continue;

        console.log(`Migrating: ${fileName}...`);

        const buffer = fs.readFileSync(filePath);
        const fileObj = {
            buffer,
            originalname: fileName,
            mimetype: getMimeType(fileName)
        };

        try {
            const publicUrl = await storageService.uploadFile(fileObj, 'migrated');
            console.log(`✅ Uploaded to: ${publicUrl}`);

            // If it's a user avatar (filename pattern check), update DB
            // Pattern: user-UUID-timestamp.ext
            if (fileName.startsWith('user-')) {
                const parts = fileName.split('-');
                if (parts.length >= 2) {
                    const userId = parts[1];
                    await prisma.user.updateMany({
                        where: { id: userId },
                        data: { avatarUrl: publicUrl }
                    });
                    console.log(`   Linked avatar to user: ${userId}`);
                }
            }
        } catch (error) {
            console.error(`❌ Failed to migrate ${fileName}:`, error.message);
        }
    }

    console.log('Migration complete.');
}

function getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4'
    };
    return map[ext] || 'application/octet-stream';
}

migrate();
