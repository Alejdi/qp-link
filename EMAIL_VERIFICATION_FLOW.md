# Email Verification Flow - Complete Integration

## Overview
Email verification has been successfully integrated with the existing phone verification system. The system now verifies both phone numbers (via WhatsApp OTP) and email addresses before allowing users to login.

## Complete Signup Flow

### Step 1: Account Details
**Page**: [signup/page.tsx](app/signup/page.tsx) (Step 1 - Account)
- User enters: Name, Email, Password, Confirm Password
- Client-side validation: Password length (min 8 chars), passwords match
- **Action**: Move to Step 2 (Phone)

### Step 2: Phone Number
**Page**: [signup/page.tsx](app/signup/page.tsx) (Step 2 - Phone)
- User selects country code and enters phone number
- **Action**: Click "Send Verification Code"
- **API Call**: `POST /api/auth/send-otp`
  - Generates 6-digit OTP
  - Stores OTP in `verification_codes` table (expires in 10 minutes)
  - Sends OTP via WhatsApp (currently logs to console in dev mode)
- **Result**: Move to Step 3 (Verify)

### Step 3: OTP Verification
**Page**: [signup/page.tsx](app/signup/page.tsx) (Step 3 - Verify)
- User enters 6-digit OTP from WhatsApp
- 60-second resend timer
- **API Call**: `POST /api/auth/verify-otp`
  - Validates OTP against database
  - Checks expiration (10 minutes)
  - Deletes used OTP
- **Result**: Move to Step 4 (Identity)

### Step 4: ID Verification
**Page**: [signup/page.tsx](app/signup/page.tsx) (Step 4 - Identity)
- User uploads ID card (front and back)
- **Action**: Click "Complete Sign Up"
- **API Call**: `POST /api/auth/signup` (FormData)
  - Creates user in database
  - Uploads ID images to Supabase Storage
  - Marks phone as verified (`phone_verified: true`)
  - Sets KYC status to 'pending'
  - **AUTOMATICALLY SENDS EMAIL VERIFICATION** (lines 220-233)
- **Result**: Redirect to `/login?registered=true&email=<user-email>`

### Step 5: Email Verification (New!)
**Automatic After Signup**:
1. Server calls `POST /api/auth/send-verification-email`
2. Generates cryptographic token (32 bytes, 24-hour expiry)
3. Stores token in `email_verification_tokens` table
4. Sends email via Resend (or logs to console if no API key)

**What User Sees**:
- Redirected to login page with success message
- Green banner showing: "Account Created Successfully!"
- Instructions to check email for verification link
- "Resend" button if email not received

### Step 6: User Clicks Verification Link
**Link Format**: `http://localhost:3000/verify-email?token=<token>`

**Page**: [verify-email/page.tsx](app/verify-email/page.tsx)
- Extracts token from URL
- **API Call**: `POST /api/auth/verify-email`
  - Validates token exists and not used
  - Checks token not expired (24 hours)
  - Marks user as verified (`email_verified: true`)
  - Marks token as used
- **Result**: Success message + auto-redirect to login (3 seconds)

### Step 7: Login
**Page**: [login/page.tsx](app/login/page.tsx)
- User enters email and password
- **Authentication Check** (in [lib/auth.ts](lib/auth.ts:52-54)):
  ```typescript
  if (!user.email_verified) {
    throw new Error('Please verify your email address before signing in')
  }
  ```
- **If Not Verified**: Error message shown
- **If Verified**: User successfully logs in → Dashboard

## Where to See the Verification Email

### Development Mode (No Resend API Key)
When you run `npm run dev` and complete signup, look in your terminal:

```
================================================================================
EMAIL VERIFICATION (Development Mode - No API Key)
================================================================================
To: user@example.com
Subject: Verify your QP Link email address

Verification Link:
http://localhost:3000/verify-email?token=abc123...

This link will expire in 24 hours.

================================================================================
```

**To Test**:
1. Copy the verification link from terminal
2. Paste it in your browser
3. You'll be redirected to the verify-email page
4. Link will be verified and you'll be redirected to login
5. Now you can login successfully

### Production Mode (With Resend API Key)
When `RESEND_API_KEY` is set in `.env.local`:
- Real email sent to user's inbox
- Beautiful HTML template with QP Link branding
- Blue "Verify Email Address" button
- From: `QP Link <onboarding@resend.dev>`

## Database Schema

### `users` Table (Modified)
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
```

### `email_verification_tokens` Table (New)
```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
```

## API Endpoints

### 1. Send Verification Email
- **Endpoint**: `POST /api/auth/send-verification-email`
- **Body**: `{ email: string, userId: string }`
- **Function**: Generates token and sends verification email
- **File**: [send-verification-email/route.ts](app/api/auth/send-verification-email/route.ts)

### 2. Verify Email
- **Endpoint**: `POST /api/auth/verify-email`
- **Body**: `{ token: string }`
- **Function**: Validates token and marks email as verified
- **File**: [verify-email/route.ts](app/api/auth/verify-email/route.ts)

### 3. Resend Verification
- **Endpoint**: `POST /api/auth/resend-verification`
- **Body**: `{ email: string }`
- **Function**: Invalidates old tokens and sends new email
- **File**: [resend-verification/route.ts](app/api/auth/resend-verification/route.ts)

## Files Modified

### 1. [signup/page.tsx](app/signup/page.tsx:236)
**Change**: Redirect includes email parameter
```typescript
router.push(`/login?registered=true&email=${encodeURIComponent(email)}`)
```

### 2. [login/page.tsx](app/login/page.tsx)
**Changes**:
- Added registration success banner (lines 104-136)
- Added resend verification functionality (lines 58-81)
- Improved error messages for email verification (lines 34-42)

### 3. [lib/auth.ts](lib/auth.ts:52-54)
**Change**: Added email verification check
```typescript
if (!(user as any).email_verified) {
  throw new Error('Please verify your email address before signing in')
}
```

### 4. [signup/route.ts](app/api/auth/signup/route.ts:220-233)
**Change**: Auto-send verification email after user creation
```typescript
try {
  await fetch(`${process.env.NEXTAUTH_URL}/api/auth/send-verification-email`, {
    method: 'POST',
    body: JSON.stringify({ email: user.email, userId: user.id })
  })
} catch (emailError) {
  console.error('Failed to send verification email:', emailError)
  // Don't fail the signup if email sending fails
}
```

## Testing the Complete Flow

### Test 1: Development Mode (Console Logging)
1. Make sure `RESEND_API_KEY` is NOT set in `.env.local`
2. Start dev server: `npm run dev`
3. Open browser: `http://localhost:3000/signup`
4. Fill in Step 1 (Account): Name, Email, Password
5. Fill in Step 2 (Phone): Select country code, enter phone number
6. Click "Send Verification Code"
7. Check terminal for OTP (e.g., `[DEV] OTP for +35569123456: 123456`)
8. Enter OTP in Step 3 (or use test OTP: `123456`)
9. Upload ID cards in Step 4
10. Click "Complete Sign Up"
11. **CHECK TERMINAL** - you'll see the verification link:
    ```
    ================================================================================
    EMAIL VERIFICATION (Development Mode - No API Key)
    ================================================================================
    Verification Link:
    http://localhost:3000/verify-email?token=abc123def456...
    ================================================================================
    ```
12. Copy the verification link
13. Paste in browser → you'll see "Email verified successfully!"
14. Auto-redirect to login page (3 seconds)
15. Login with your email and password
16. Success! You're logged in

### Test 2: Production Mode (Real Emails)
1. Set `RESEND_API_KEY` in `.env.local` (see [RESEND_SETUP_GUIDE.md](RESEND_SETUP_GUIDE.md))
2. Restart dev server: `npm run dev`
3. Complete signup flow (Steps 1-4)
4. Check your email inbox
5. Click verification link in email
6. Login successfully

## Security Features

### Email Verification
- ✅ Cryptographically secure tokens (32 bytes random)
- ✅ 24-hour token expiry
- ✅ Single-use tokens (marked as used)
- ✅ Old tokens invalidated when requesting new verification
- ✅ Email enumeration protection

### Phone Verification
- ✅ 10-minute OTP expiry
- ✅ OTP deleted after successful verification
- ✅ Rate limiting via resend timer (60 seconds)

### Combined Security
- ✅ Multi-factor verification (Phone + Email)
- ✅ ID verification for KYC compliance
- ✅ Account banned check
- ✅ Duplicate email/phone detection

## User Experience Flow Chart

```
┌─────────────────┐
│  Step 1: Enter  │
│  Account Info   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Step 2: Enter  │
│  Phone Number   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 3: Verify  │
│  Phone via OTP  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Step 4: Upload │
│     ID Card     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  User Created   │─────▶│ Email Sent Auto  │
│   in Database   │      │  (Verification)  │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│ Redirect to     │
│ Login Page      │
│ (Success Banner)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ User Checks     │─────▶│ Clicks Link in   │
│ Email Inbox     │      │     Email        │
└─────────────────┘      └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Email Verified   │
                         │ (email_verified  │
                         │   set to TRUE)   │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ User Can Login   │
                         │   Successfully   │
                         └──────────────────┘
```

## Troubleshooting

### Issue: "Please verify your email address before signing in"
**Solution**:
1. Check your email inbox for verification link
2. Check spam/junk folder
3. If no email received, click "Resend" on login page
4. In development, check terminal for verification link

### Issue: Verification link expired
**Solution**:
1. Go to login page
2. Look for the green registration banner
3. Click "Didn't receive the email? Resend"
4. Check inbox for new verification email

### Issue: Cannot complete signup (stuck on phone verification)
**Solution**:
1. In development mode, use test OTP: `123456`
2. Check terminal for actual OTP if test OTP doesn't work
3. Make sure `verification_codes` table exists in database

### Issue: Email not sending in production
**Solution**:
1. Verify `RESEND_API_KEY` is set in `.env.local`
2. Restart development server after adding API key
3. Check Resend dashboard logs
4. Check terminal for error messages

## Next Steps

1. ✅ Email verification system implemented
2. ✅ Integration with phone verification complete
3. ✅ User-friendly login page with resend option
4. ⏭️ Add custom domain to Resend (production)
5. ⏭️ Customize email template with logo
6. ⏭️ Set up email notification system for transactions
7. ⏭️ Implement password reset via email

## Support

If you encounter any issues:
1. Check this guide first
2. Check [RESEND_SETUP_GUIDE.md](RESEND_SETUP_GUIDE.md) for email service setup
3. Check [EMAIL_VERIFICATION_SETUP.md](EMAIL_VERIFICATION_SETUP.md) for technical details
4. Check terminal/console logs for error messages
