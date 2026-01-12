require('dotenv').config();
const twilio = require('twilio');
const path = require('path');

async function setupTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const appUrl = process.env.APP_URL;

    if (!accountSid || !authToken) {
        console.error('❌ Twilio credentials missing in .env');
        return;
    }

    if (!appUrl) {
        console.error('❌ APP_URL missing in .env. Twilio needs a public URL to reach your server.');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log('--- Twilio Webhook Setup ---');
    console.log(`Target URL: ${appUrl}`);

    try {
        const numbers = await client.incomingPhoneNumbers.list();

        if (numbers.length === 0) {
            console.log('No phone numbers found in this Twilio account.');
            return;
        }

        for (const number of numbers) {
            console.log(`\nUpdating number: ${number.phoneNumber} (${number.sid})`);

            const voiceUrl = `${appUrl}/api/twilio/webhook/voice`;
            const smsUrl = `${appUrl}/api/twilio/webhook/sms`;

            await client.incomingPhoneNumbers(number.sid).update({
                voiceUrl: voiceUrl,
                voiceMethod: 'POST',
                smsUrl: smsUrl,
                smsMethod: 'POST'
            });

            console.log(`✅ Voice URL: ${voiceUrl}`);
            console.log(`✅ SMS URL:   ${smsUrl}`);
        }

        console.log('\n✨ All Twilio numbers have been updated!');
        console.log('   Note: Make sure your server is running and accessible at ' + appUrl);

    } catch (error) {
        console.error('❌ Error updating Twilio numbers:', error.message);
    }
}

setupTwilio();
