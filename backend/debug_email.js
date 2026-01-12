require('dotenv').config();
const nodemailer = require('nodemailer');

async function testConnection(port, secure) {
    console.log(`\n🔍 Testing Port: ${port}, Secure: ${secure}`);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 5000 // 5 seconds timeout
    });

    try {
        await transporter.verify();
        console.log(`✅ SUCCESS on Port ${port}!`);
        return transporter;
    } catch (error) {
        console.log(`❌ FAILED on Port ${port}: ${error.code || error.message}`);
        return null;
    }
}

async function debugEmail() {
    console.log('🔍 User SMTP Config:', process.env.SMTP_HOST);

    // Test 1: Port 587 (Explicit/STARTTLS)
    let transporter = await testConnection(587, false);

    // Test 2: Port 465 (Implicit/SSL)
    if (!transporter) {
        transporter = await testConnection(465, true);
    }

    if (transporter) {
        console.log('\n⏳ Sending Test Email...');
        try {
            const info = await transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME || 'Debug'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
                to: process.env.SMTP_USER,
                subject: 'Debug Test Email (Success)',
                html: '<h3>It Works!</h3><p>This is a test email from the debugger.</p>'
            });
            console.log('✅ Email Sent successfully!');
            console.log('Message ID:', info.messageId);
        } catch (e) {
            console.error('❌ Send Failed:', e.message);
        }
    } else {
        console.error('\n🔴 All connection attempts failed. Check firewall or credentials.');
    }
}

debugEmail();
