# QP Link - Deployment Guide

Complete step-by-step guide to deploy QP Link to production.

## Prerequisites Checklist

- [ ] GitHub account
- [ ] Vercel account
- [ ] Neon or Supabase account (PostgreSQL)
- [ ] Stripe account
- [ ] Cloudflare account (for R2)

## Step 1: Database Setup (Neon)

### Create Database

1. Go to https://neon.tech and sign up
2. Click "Create Project"
3. Choose a name: `qplink-production`
4. Select a region close to your users
5. Click "Create Project"

### Get Connection String

1. In your Neon dashboard, go to "Connection Details"
2. Copy the connection string (it looks like):
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Save this for later as `DATABASE_URL`

## Step 2: Cloudflare R2 Setup

### Create R2 Bucket

1. Log in to Cloudflare dashboard
2. Go to R2 Object Storage
3. Click "Create bucket"
4. Name it: `qplink-images`
5. Click "Create bucket"

### Configure Public Access

1. Go to your bucket settings
2. Under "Public Access", enable public read access
3. Note the public URL (e.g., `https://pub-xxxxx.r2.dev`)

### Create API Token

1. Go to R2 → Manage R2 API Tokens
2. Click "Create API Token"
3. Name: `qplink-production`
4. Permissions: Object Read & Write
5. Click "Create API Token"
6. Save the following:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
   - Account ID → `R2_ACCOUNT_ID`

## Step 3: Stripe Setup

### Get API Keys

1. Log in to https://stripe.com
2. Go to Developers → API keys
3. Copy:
   - Publishable key → `STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

### Configure Webhooks (After Vercel Deployment)

We'll set this up in Step 5 after deploying to Vercel.

## Step 4: Deploy to Vercel

### Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/qp-link.git
git branch -M main
git push -u origin main
```

### Import to Vercel

1. Go to https://vercel.com and log in
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `next build`
   - Output Directory: `.next`

### Add Environment Variables

In Vercel project settings → Environment Variables, add:

```env
# Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate-random-32-char-string

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (we'll add this in Step 5)

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=qplink-images
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Generate NEXTAUTH_SECRET

Run this command locally:
```bash
openssl rand -base64 32
```

### Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Note your deployment URL: `https://your-project.vercel.app`

## Step 5: Database Migrations

### Run Migrations

After deployment, you need to run database migrations:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Run migration
vercel env pull .env.local
npx prisma migrate deploy
```

Alternatively, you can run migrations from your local machine:

```bash
# Set DATABASE_URL to your production database
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

## Step 6: Complete Stripe Webhook Setup

### Add Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"

### Get Webhook Secret

1. Click on your newly created webhook
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### Add to Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add `STRIPE_WEBHOOK_SECRET` with the value you just copied
3. Redeploy your application

## Step 7: Custom Domain (Optional)

### Add Custom Domain

1. In Vercel dashboard, go to Settings → Domains
2. Add your domain (e.g., `qplink.com`)
3. Follow DNS configuration instructions
4. Update environment variables:
   - `NEXTAUTH_URL=https://qplink.com`
   - `NEXT_PUBLIC_APP_URL=https://qplink.com`
5. Update Stripe webhook URL to use your custom domain

## Step 8: Testing

### Test Checklist

- [ ] Visit your deployed URL
- [ ] Sign up for a new account
- [ ] Create a payment link
- [ ] Visit the public payment link (`/p/[shortId]`)
- [ ] Verify analytics are being tracked
- [ ] Complete a test payment (use Stripe test cards)
- [ ] Check webhook is receiving events
- [ ] Verify payment shows in dashboard
- [ ] Test QR code generation
- [ ] Test image upload
- [ ] Test settings page
- [ ] Test password change

### Stripe Test Cards

For testing payments:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Use any future expiry date and any CVC

## Step 9: Production Checklist

Before going live:

- [ ] Switch to Stripe live keys
- [ ] Update all environment variables to production values
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Configure rate limiting appropriately
- [ ] Set up database backups (Neon does this automatically)
- [ ] Add custom domain
- [ ] Configure SSL/TLS (Vercel handles this)
- [ ] Set up uptime monitoring
- [ ] Review security headers
- [ ] Test all critical flows
- [ ] Prepare support documentation

## Monitoring & Maintenance

### Database

- **Neon**: Automatic backups, point-in-time recovery
- Monitor connection pooling
- Set up alerts for connection limits

### Vercel

- Monitor build times
- Check function execution logs
- Review error rates in dashboard
- Set up email notifications for deployment failures

### Stripe

- Monitor webhook delivery
- Set up balance notifications
- Review failed payments
- Enable radar for fraud detection

### R2

- Monitor storage usage
- Review bandwidth usage
- Set up billing alerts

## Troubleshooting

### Build Fails

```bash
# Check build logs in Vercel
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Prisma generation failed

# Fix and redeploy
git push
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is correct
# Check Neon dashboard for connection limits
# Test connection locally:
npx prisma db push
```

### Stripe Webhook Not Working

```bash
# Test webhook locally:
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In production:
# - Verify URL is correct
# - Check webhook secret matches
# - Review Stripe webhook logs
# - Check Vercel function logs
```

### Images Not Loading

```bash
# Verify R2 configuration:
# - Bucket is public
# - CORS is configured
# - Environment variables are correct
# - Public URL is accessible
```

## Scaling Considerations

### When to Scale

- More than 1000 payment links
- More than 10,000 monthly visitors
- More than 1GB of images

### Scaling Options

1. **Database**: Upgrade Neon plan or switch to dedicated instance
2. **Storage**: R2 scales automatically, just pay for usage
3. **Compute**: Vercel Pro for better performance
4. **CDN**: Cloudflare for global distribution

## Backup Strategy

### Database Backups

- Neon: Automatic daily backups (7-day retention)
- Manual backups: Use `pg_dump`

### Image Backups

- R2: Enable versioning
- Consider S3 backup sync

### Code Backups

- GitHub: Primary repository
- Consider GitLab/Bitbucket mirror

## Security

### Production Security Checklist

- [ ] Enable Vercel Firewall
- [ ] Configure CSP headers
- [ ] Enable rate limiting
- [ ] Set up DDoS protection
- [ ] Review OWASP Top 10
- [ ] Enable Stripe Radar
- [ ] Set up 2FA on all accounts
- [ ] Regular dependency updates
- [ ] Security audit logs

## Support

For deployment issues:
- Vercel: https://vercel.com/support
- Neon: https://neon.tech/docs
- Stripe: https://support.stripe.com
- Cloudflare: https://support.cloudflare.com
