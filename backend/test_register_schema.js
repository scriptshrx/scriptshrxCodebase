const { registerSchema } = require('./src/schemas/validation');

const testData = {
  name: 'Gil Marquez',
  email: 'info@scriptishrx.com',
  password: 'Goingtothelake1711!',
  accountType: 'ORGANIZATION',
  companyName: 'Scriptishrx LLC'
};

console.log('Testing registration schema with:', testData);

try {
  const result = registerSchema.parse(testData);
  console.log('✓ Schema validation passed:', result);
} catch (error) {
  console.log('✗ Schema validation failed:');
  console.log(error.errors || error.message);
}
