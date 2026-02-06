const bcrypt = require('bcryptjs');

const password = 'Shkoder!2025';

console.log('Generating hash for:', password);

bcrypt.hash(password, 12, async function(err, hash) {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('\nGenerated hash:', hash);

  // Test it immediately
  const match = await bcrypt.compare(password, hash);
  console.log('Hash verification:', match ? 'SUCCESS' : 'FAILED');

  // Show the hash for database update
  console.log('\nUse this hash in database:');
  console.log(hash);
});
