const { PrismaClient } = require('@prisma/client');

console.log('--- Database Connection Diagnostic ---');
console.log('Checking DATABASE_URL...');

const url = process.env.DATABASE_URL;

if (!url) {
    console.error('❌ DATABASE_URL is NOT set in environment.');
} else {
    try {
        // Simple regex to extract host without revealing password
        // Format: postgresql://user:pass@HOST:PORT/db
        const match = url.match(/@([^:]+):/);
        if (match && match[1]) {
            console.log(`✅ Pointing to HOST: ${match[1]}`);

            // Check if it's Supabase
            if (match[1].includes('supabase.com') || match[1].includes('supabase.co')) {
                console.log('   (This looks like a Supabase Production/Cloud instance)');
            } else if (match[1].includes('localhost') || match[1].includes('127.0.0.1')) {
                console.log('   (This is a LOCAL database)');
            }
        } else {
            console.log('❌ Could not parse host from DATABASE_URL.');
        }
    } catch (e) {
        console.error('Error parsing URL:', e);
    }
}

console.log('--------------------------------------');
