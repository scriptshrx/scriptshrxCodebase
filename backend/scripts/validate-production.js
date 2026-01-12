const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('Validating production environment...');

const requiredVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'JWT_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'OPENAI_API_KEY'
];

let hasError = false;

requiredVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`❌ Missing environment variable: ${varName}`);
        hasError = true;
    } else {
        console.log(`✅ ${varName} is set`);
    }
});

// Check if VoiceCake vars are removed (optional warning)
if (process.env.VOICECAKE_API_KEY) {
    console.warn('⚠️  VOICECAKE_API_KEY is still present in .env (Deprecated)');
}

if (hasError) {
    console.error('\nEnvironment validation failed. Please check .env file.');
    process.exit(1);
} else {
    console.log('\nProduction validation passed! 🚀');
    process.exit(0);
}
