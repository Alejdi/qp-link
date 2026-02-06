# URGENT: Database Setup Required

## Error Summary
Your signup flow is failing because several database tables and columns are missing. Here's what needs to be fixed:

### Errors Found:
1. ❌ Missing `verification_codes` table (for phone OTP)
2. ❌ Missing `id_verified` column in users table
3. ❌ Missing `email_verified` column in users table
4. ❌ Missing `phone_verified` column in users table
5. ❌ Missing `id-documents` storage bucket

## Quick Fix (5 minutes)

### Step 1: Run the SQL Migration

1. Open Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase_migrations/004_complete_verification_setup.sql`
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)

You should see:
```
Success. No rows returned
```

### Step 2: Create the Storage Bucket

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click **Create a new bucket**
3. Enter bucket name: `id-documents`
4. **Important**: Select **Private** (not public)
5. Click **Create bucket**

### Step 3: Set Storage Policies

After creating the bucket:

1. Click on the `id-documents` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Choose **Custom policy**
5. Add these two policies:

**Policy 1: Allow Users to Upload**
```sql
CREATE POLICY "Users can upload their ID documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-documents');
```

**Policy 2: Allow Service Role to Read**
```sql
CREATE POLICY "Service role can read all ID documents"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'id-documents');
```

### Step 4: Verify Setup

Run this query in SQL Editor to verify columns exist:

```sql
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('email_verified', 'phone_verified', 'id_verified', 'kyc_status')
ORDER BY column_name;
```

You should see 4 rows returned.

### Step 5: Test Signup Again

1. Your terminal should still be running `npm run dev`
2. Go to: http://localhost:3000/signup
3. Complete all 4 steps:
   - Step 1: Enter account details
   - Step 2: Enter phone number
   - Step 3: Use test OTP: `123456`
   - Step 4: Upload ID cards (any 2 images)
4. After clicking "Complete Sign Up", check your terminal for:

```
================================================================================
EMAIL VERIFICATION (Development Mode - No API Key)
================================================================================
To: youremail@example.com
Subject: Verify your QP Link email address

Verification Link:
http://localhost:3000/verify-email?token=abc123...
================================================================================
```

5. Copy the verification link from terminal
6. Paste in browser to verify email
7. Now you can login!

## What Each Table Does

### `verification_codes`
- Stores phone verification OTPs
- 6-digit codes sent via WhatsApp
- Expires after 10 minutes

### `email_verification_tokens`
- Stores email verification tokens
- 32-byte cryptographic tokens
- Expires after 24 hours
- Single-use (marked as used after verification)

### Storage Bucket: `id-documents`
- Stores uploaded ID card images (front and back)
- Private bucket (not publicly accessible)
- Used for KYC verification

## Current Status

After you run the migration:

✅ Phone verification will work (OTP codes stored properly)
✅ Email verification will work (tokens stored properly)
✅ ID upload will work (images stored in bucket)
✅ User creation will succeed
✅ Login will check email verification

## Test OTP Codes

In development mode, you can use these:
- **Test OTP**: `123456` (always works)
- **Real OTP**: Check terminal after clicking "Send Verification Code"

## Troubleshooting

### If migration fails:
- Make sure you selected the correct project in Supabase
- Check if tables already exist (might have been created manually)
- Try running each section of the SQL separately

### If storage bucket creation fails:
- Make sure you're on a paid Supabase plan (free tier has limits)
- Or remove ID upload requirement temporarily

### If still getting errors:
1. Check terminal for specific error messages
2. Check Supabase logs (Dashboard → Logs)
3. Verify all environment variables are set in `.env.local`
