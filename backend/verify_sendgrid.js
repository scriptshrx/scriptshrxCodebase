require('dotenv').config();
const notificationService = require('./src/services/notificationService');

async function test() {
    console.log('--- SendGrid Direct Test ---');
    console.log('Checking Environment Variables...');
    if (process.env.SENDGRID_API_KEY) {
        console.log('✅ SENDGRID_API_KEY found:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');
    } else {
        console.error('❌ SENDGRID_API_KEY NOT found in process.env');
    }

    if (process.env.MOCK_EMAIL === 'true') {
        console.warn('⚠️ MOCK_EMAIL is set to true. Real email will NOT be sent.');
    } else {
        console.log('✅ MOCK_EMAIL is false (or unset). Real email attempt enabled.');
    }

    console.log('\nAttempting to send test email...');
    try {
        // Using a generic test email. SendGrid might accept it but it won't be delivered.
        // We are mainly checking for Authentication errors.
        await notificationService.sendEmail(
            'vincentagber74@gmail.com',
            'ScriptishRx SendGrid Test',
            '<h1>It Works!</h1><p>This is a test email from the ScriptishRx SendGrid integration to verify connectivity.</p>'
        );
        console.log('\n✅ verify function call completed (Check output above for "Email sent" or error).');
    } catch (error) {
        console.error('\n❌ Test execution failed:', error.message);
    }
}

test();
