require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const axios = require('axios');
const twilio = require('twilio');

async function verify() {
    console.log("=== STARTING CONNECTION VERIFICATION ===");

    // 1. DATABASE
    console.log("\n[1/5] Testing Database Connection (Prisma)...");
    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        const userCount = await prisma.user.count();
        console.log(`✅ Database Connected! User count: ${userCount}`);
        console.log(`   (Using URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')})`);
    } catch (e) {
        console.error("❌ Database Connection Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }

    // 2. SMTP
    console.log("\n[2/5] Testing SMTP Connection...");
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false }
    });
    try {
        await transporter.verify();
        console.log("✅ SMTP Connection Successful!");
    } catch (e) {
        console.error("❌ SMTP Connection Failed:", e.message);
    }

    // 3. OPENAI
    console.log("\n[3/5] Testing OpenAI API key...");
    try {
        const res = await axios.get('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        if (res.status === 200) {
            console.log("✅ OpenAI API Key valid! Models available: " + res.data.data.length);
        }
    } catch (e) {
        console.error("❌ OpenAI API Failed:", e.message);
    }

    // 4. TWILIO
    console.log("\n[4/5] Testing Twilio...");
    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const account = await client.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log(`✅ Twilio Connected! Account: ${account.friendlyName} (${account.status})`);
    } catch (e) {
        console.error("❌ Twilio Failed:", e.message);
    }

    // 5. GOOGLE OAUTH CONFIG CHECK
    console.log("\n[5/5] Checking Google OAuth Config...");
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI) {
        console.log("✅ Google Client ID is configured.");
        console.log("   Redirect URI: " + process.env.GOOGLE_REDIRECT_URI);
    } else {
        console.error("❌ Google OAuth Config Missing!");
    }

    console.log("\n=== VERIFICATION COMPLETE ===");
}

verify();
