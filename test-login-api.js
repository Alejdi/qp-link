const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testLogin() {
  const email = 'alejdgallubja@icloud.com';
  const password = 'Shkoder!2025';

  console.log('\n=== Testing Login Flow ===');
  console.log('Email:', email);
  console.log('Password:', password);

  // 1. Fetch user from database
  console.log('\n1. Fetching user from database...');
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, password, role, is_banned, email_verified')
    .eq('email', email)
    .single();

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  if (!user) {
    console.error('❌ User not found');
    return;
  }

  console.log('✅ User found:');
  console.log('  - ID:', user.id);
  console.log('  - Email:', user.email);
  console.log('  - Name:', user.name);
  console.log('  - Role:', user.role);
  console.log('  - Is Banned:', user.is_banned);
  console.log('  - Email Verified:', user.email_verified);
  console.log('  - Has Password:', !!user.password);

  // 2. Check if user is banned
  if (user.is_banned) {
    console.error('❌ Account is banned');
    return;
  }
  console.log('✅ Account not banned');

  // 3. Check if email is verified
  if (!user.email_verified) {
    console.error('❌ Email not verified');
    return;
  }
  console.log('✅ Email verified');

  // 4. Check password
  console.log('\n2. Checking password...');
  console.log('Password hash from DB:', user.password);

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    console.error('❌ Password does not match');
    console.log('\nDebug: Testing password directly...');
    const testResult = await bcrypt.compare(password, user.password);
    console.log('Direct test result:', testResult);
    return;
  }

  console.log('✅ Password matches!');

  console.log('\n=== LOGIN SHOULD WORK ===\n');
}

testLogin().catch(err => {
  console.error('Fatal error:', err);
});
