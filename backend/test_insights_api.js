#!/usr/bin/env node

/**
 * Test script to verify the insights API endpoint works
 * Usage: node backend/test_insights_api.js <token>
 */

const http = require('http');
require('dotenv').config({ path: '.env' });

const token = process.argv[2] || process.env.TEST_TOKEN;

if (!token) {
    console.error('Error: Please provide a token as argument or TEST_TOKEN env var');
    console.error('Usage: node backend/test_insights_api.js <token>');
    process.exit(1);
}

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 8000,
    path: '/api/insights',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

console.log(`Testing insights API at http://${options.hostname}:${options.port}${options.path}`);
console.log(`Using token: ${token.substring(0, 20)}...`);

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`\nStatus: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        console.log('\nResponse:');
        try {
            const parsed = JSON.parse(data);
            console.log(JSON.stringify(parsed, null, 2));
            
            // Verify required fields
            const required = ['metrics', 'revenueChart', 'behaviorChart', 'aiRecommendation'];
            const missing = required.filter(field => !parsed[field]);
            
            if (missing.length > 0) {
                console.error(`\n❌ Missing fields: ${missing.join(', ')}`);
            } else {
                console.log(`\n✅ All required fields present!`);
            }
        } catch (e) {
            console.error('Failed to parse response as JSON:', e.message);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
    process.exit(1);
});

req.end();
