const bcrypt = require('bcryptjs');

// Hash from database
const hashFromDB = '$2a$12$2XhT/.jG5b0lfOeXhu5OVuc0ebS06jNCpnY/a4lJgyymzK9jzURvu';
const password = 'Shkoder!2025';

console.log('Password:', password);
console.log('Hash from DB:', hashFromDB);

bcrypt.compare(password, hashFromDB).then(match => {
  console.log('\n===================');
  if (match) {
    console.log('✅ LOGIN WILL WORK!');
  } else {
    console.log('❌ LOGIN WILL FAIL');
  }
  console.log('===================\n');
});
