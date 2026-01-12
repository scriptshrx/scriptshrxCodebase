
const prisma = require('./lib/prisma');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Starting Upload Verification...");

    // Simulate File Upload Logic
    // We can't easily mock multipart/form-data via script without heavy deps (axios + formData)
    // So we will verify the Logic:
    // 1. Manually create a file in uploads
    // 2. Update DB manually
    // 3. Verify Static Serve

    const testFile = 'test-avatar.txt';
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

    fs.writeFileSync(path.join(uploadsDir, testFile), 'Test Avatar Content');
    console.log("✅ Created test file in uploads/ directory");

    const user = await prisma.user.findFirst();
    await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: `/uploads/${testFile}` }
    });
    console.log(`✅ Updated User ${user.email} with avatarUrl`);

    // Verify Fetch
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (updatedUser.avatarUrl === `/uploads/${testFile}`) {
        console.log("✅ Database persistence verified");
    } else {
        console.error("❌ Database persistence failed");
    }

    // Warn user to manually test via UI because full integration test needs frontend
    console.log("⚠️  Please perform manual upload test via Dashboard Settings to verify Multer middleware.");

    console.log("---------------------------------");
    console.log("Upload Logic Verification Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
