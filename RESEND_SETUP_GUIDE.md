# Resend Email Service Setup Guide

## Quick Steps to Get Your Resend API Key

### 1. Sign Up for Resend (FREE)

1. Go to [https://resend.com](https://resend.com)
2. Click "Get Started" or "Sign Up"
3. Create an account (it's free - 100 emails/day, 3,000 emails/month)

### 2. Get Your API Key

1. After signing up, you'll be taken to the dashboard
2. Click on "API Keys" in the left sidebar
3. Click "Create API Key"
4. Give it a name like "QP Link Production" or "QP Link Development"
5. Select permissions: **Full Access** (or at minimum "Sending access")
6. Click "Create"
7. **COPY THE API KEY** - you won't see it again!

The API key looks like: `re_123abc456def789...`

### 3. Add API Key to Your Environment Variables

Open your `.env` or `.env.local` file and add:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

**Example:**
```env
RESEND_API_KEY=re_abc123def456ghi789jkl012mno345pqr678stu
```

### 4. Test It Out (Development)

You can test immediately with the default sender:
- **From address**: `onboarding@resend.dev`
- This works out of the box for testing

### 5. Add Your Own Domain (Production - Optional)

For production, you'll want to use your own domain:

#### Step 1: Add Domain in Resend

1. Go to "Domains" in Resend dashboard
2. Click "Add Domain"
3. Enter your domain (e.g., `qplink.com`)

#### Step 2: Add DNS Records

Resend will give you DNS records to add to your domain:
- **TXT records** for verification
- **MX and TXT records** for sending

Go to your domain registrar (GoDaddy, Namecheap, etc.) and add these records.

#### Step 3: Update the From Address

In the file `send-verification-email/route.ts`, change line 85:

```typescript
// FROM:
from: 'QP Link <onboarding@resend.dev>',

// TO:
from: 'QP Link <noreply@your domain.com>',
```

### 6. Environment Variables Checklist

Make sure your `.env` or `.env.local` has:

```env
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here

# Next Auth (already set)
NEXTAUTH_URL=http://localhost:3000  # Change to your production URL when deploying
NEXTAUTH_SECRET=your_secret_here

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing the Email Flow

### Test Without API Key (Development Mode)
1. Don't add `RESEND_API_KEY` to `.env`
2. Sign up a new user
3. Check your console/terminal - the verification link will be logged there
4. Copy the link and paste in browser to verify

### Test With API Key (Production Mode)
1. Add `RESEND_API_KEY` to `.env.local`
2. Restart your development server
3. Sign up with your actual email
4. Check your inbox for the verification email
5. Click the link to verify

## Troubleshooting

### Emails Not Sending?

**Check 1: Is the API key set?**
```bash
# In your terminal, check if the env variable is loaded
echo $RESEND_API_KEY
```

**Check 2: Restart your server**
```bash
# Kill the server (Ctrl+C) and restart
npm run dev
```

**Check 3: Check the Resend logs**
- Go to Resend dashboard
- Click "Logs" in the sidebar
- See if emails are being attempted

**Check 4: Check spam folder**
- Resend emails might go to spam initially
- Mark as "Not Spam" to train your email provider

### Common Errors

**Error: "API key is invalid"**
- Double-check you copied the full API key
- Make sure there are no extra spaces
- Create a new API key and try again

**Error: "Sender email not verified"**
- Using `onboarding@resend.dev` works by default
- If using custom domain, verify it in Resend dashboard first

**Error: "Rate limit exceeded"**
- Free plan: 100 emails/day, 3,000/month
- Upgrade to paid plan if needed (starts at $20/month)

## Resend Pricing

### Free Plan (Perfect for Testing)
- 100 emails per day
- 3,000 emails per month
- All features included
- No credit card required

### Paid Plans (When You Grow)
- **$20/month**: 50,000 emails/month
- **Custom**: Higher volumes, dedicated IPs

## Email Template Customization

The email template is in: `app/api/auth/send-verification-email/route.ts` (lines 88-144)

You can customize:
- Colors (currently using `#21255B` - your brand color)
- Logo (add an `<img>` tag)
- Text and messaging
- Layout and styling

## Next Steps After Setup

1. ✅ Get Resend API key
2. ✅ Add to `.env.local`
3. ✅ Test signup flow
4. ✅ Verify email arrives
5. ⏭️ (Later) Add custom domain for production
6. ⏭️ (Later) Customize email template with your logo

## Support

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **Resend Discord**: https://resend.com/discord
