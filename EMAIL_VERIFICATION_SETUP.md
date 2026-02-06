# Email Verification Setup Guide

## Overview
Email verification has been implemented to ensure users verify their email addresses before they can access the platform.

## What Was Implemented

### 1. Database Changes
- **Migration File**: `supabase_migrations/003_email_verification.sql`
- Added `email_verified` column to users table (default: false)
- Created `email_verification_tokens` table to store verification tokens
- Tokens expire after 24 hours

### 2. API Endpoints

#### Send Verification Email
- **Endpoint**: `/api/auth/send-verification-email`
- **Method**: POST
- **Body**: `{ email, userId }`
- Generates a unique token and sends verification email

#### Verify Email
- **Endpoint**: `/api/auth/verify-email`
- **Method**: POST
- **Body**: `{ token }`
- Validates token and marks email as verified

#### Resend Verification
- **Endpoint**: `/api/auth/resend-verification`
- **Method**: POST
- **Body**: `{ email }`
- Invalidates old tokens and sends a new verification email

### 3. User Flow

1. **Signup**: User creates account → verification email sent automatically
2. **Email**: User receives email with verification link
3. **Verification**: User clicks link → redirected to `/verify-email?token=xxx`
4. **Login**: User can only login after email is verified

### 4. Authentication Changes
- Updated `lib/auth.ts` to check `email_verified` status
- Google OAuth users are auto-verified (emails verified by Google)
- Unverified users get error: "Please verify your email address before signing in"

### 5. Pages Created

#### Verify Email Page (`/verify-email`)
- Handles email verification via token
- Shows success/error states
- Auto-redirects to login on success

## Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Add email_verified column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
```

## Email Service Integration

Currently, verification emails are logged to the console. To send actual emails, integrate with an email service:

### Option 1: Resend (Recommended)

1. Install Resend:
```bash
npm install resend
```

2. Update `/api/auth/send-verification-email/route.ts`:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'QP Link <noreply@qplink.com>',
  to: email,
  subject: 'Verify your QP Link email address',
  html: `
    <h2>Welcome to QP Link!</h2>
    <p>Please verify your email address by clicking the button below:</p>
    <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #21255B; color: white; text-decoration: none; border-radius: 8px;">
      Verify Email Address
    </a>
    <p>Or copy and paste this link: ${verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>
  `
})
```

### Option 2: SendGrid

1. Install SendGrid:
```bash
npm install @sendgrid/mail
```

2. Update the send email endpoint similarly

## Environment Variables

Add to `.env.local`:
```
RESEND_API_KEY=re_xxxxxxxxx
# or
SENDGRID_API_KEY=SG.xxxxxxxxx
```

## Testing

### Test the Flow

1. **Sign Up**: Create new account at `/signup`
2. **Check Console**: Verification link will be logged
3. **Verify**: Copy the verification URL and paste in browser
4. **Login**: Try logging in - should work after verification

### Manual Verification (for testing)

If you need to manually verify a user:
```sql
UPDATE users SET email_verified = true WHERE email = 'test@example.com';
```

## Security Features

- ✅ Tokens are cryptographically random (32 bytes)
- ✅ Tokens expire after 24 hours
- ✅ Tokens are single-use (marked as used after verification)
- ✅ Old tokens are invalidated when requesting new verification
- ✅ Email enumeration protection (doesn't reveal if email exists)

## Next Steps

1. **Deploy Database Migration**: Run the SQL migration in Supabase
2. **Set Up Email Service**: Choose and configure Resend or SendGrid
3. **Update Email Templates**: Customize the verification email design
4. **Test Thoroughly**: Test signup → verify → login flow
5. **Monitor**: Set up logging for failed verifications

## Troubleshooting

### Users Can't Login
- Check if `email_verified` is true in database
- Manually verify for testing: `UPDATE users SET email_verified = true WHERE id = 'user-id'`

### Verification Link Expired
- Users can request new link at login page (implement "Resend verification" button)
- Or use the resend-verification endpoint

### Email Not Sending
- Check console logs for the verification URL
- Verify email service API keys are set
- Check email service dashboard for errors
