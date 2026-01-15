const axios = require('axios');

const testData = {
  name: 'Gil Marquez',
  email: 'info@scriptishrx.com',
  password: 'Goingtothelake1711!',
  accountType: 'ORGANIZATION',
  companyName: 'Scriptishrx LLC'
};

async function testRegistration() {
  try {
    console.log('Testing registration with:', testData);
    const response = await axios.post('http://localhost:5000/api/auth/register', testData);
    console.log('✓ Registration successful:', response.data);
  } catch (error) {
    console.error('✗ Registration failed');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testRegistration();
