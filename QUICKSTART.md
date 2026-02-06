# QP Link - Quick Start Guide

Get up and running in 5 minutes!

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Minimum required for local development:
DATABASE_URL="postgresql://localhost:5432/qplink"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Add these when ready:
STRIPE_SECRET_KEY="get from stripe.com"
STRIPE_PUBLISHABLE_KEY="get from stripe.com"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="get from stripe.com"
R2_ACCOUNT_ID="get from cloudflare"
R2_ACCESS_KEY_ID="get from cloudflare"
R2_SECRET_ACCESS_KEY="get from cloudflare"
R2_BUCKET_NAME="qplink-images"
R2_PUBLIC_URL="https://your-bucket.r2.dev"
```

### 3. Set Up Database

Start PostgreSQL locally (or use Docker):

```bash
# Using Docker
docker run --name qplink-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=qplink -p 5432:5432 -d postgres

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing Locally

### Without Full Setup

You can test the app without Stripe/R2 initially:

1. Sign up for an account
2. Create a payment link (without image)
3. The Stripe link creation will fail, but the product will be saved
4. You can still see the dashboard and analytics

### With Stripe Test Mode

1. Create a free Stripe account
2. Use test API keys
3. Create payment links with real Stripe integration
4. Test with card: 4242 4242 4242 4242

### With Cloudflare R2

1. Create a free Cloudflare account
2. Create an R2 bucket
3. Upload product images

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create migration
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema changes

# Testing
npm run lint             # Run linter
```

## Stripe Webhook Testing (Local)

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Get webhook secret from output and add to .env:
# STRIPE_WEBHOOK_SECRET=whsec_...
```

## Project Structure Overview

```
qp-link/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # Dashboard pages
│   ├── p/[shortId]/      # Public product pages
│   ├── login/            # Auth pages
│   └── page.tsx          # Landing page
├── components/            # React components
├── lib/                  # Utilities
├── actions/              # Server actions
├── prisma/               # Database schema
└── types/                # TypeScript types
```

## What You Can Build

### Basic Flow

1. **User signs up** → Creates account
2. **User creates product** → Uploads image, sets price
3. **System generates**:
   - Short URL (e.g., qp.link/p/abc123)
   - Stripe payment link
   - QR code
4. **User shares link** → Via social media, email, etc.
5. **Customer visits link** → Sees product page
6. **Customer clicks "Pay Now"** → Redirects to Stripe
7. **Customer completes payment** → Success!
8. **Analytics tracked** → Dashboard updates

### Features to Test

- [ ] User signup/login
- [ ] Create payment link
- [ ] Upload product image
- [ ] View product public page
- [ ] Generate QR code
- [ ] Track analytics
- [ ] Complete test payment
- [ ] View dashboard stats
- [ ] Update profile
- [ ] Change password

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
# macOS/Linux:
pg_isready

# Windows:
# Check Services app for PostgreSQL

# Reset database
npx prisma migrate reset
```

### Prisma Client Not Generated

```bash
npx prisma generate
```

### Module Not Found

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

## Next Steps

1. ✅ Get the app running locally
2. 📝 Read the full [README.md](README.md)
3. 🚀 Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy
4. 🎨 Customize the UI/branding
5. 💰 Add more features!

## Getting Help

- Check [README.md](README.md) for detailed docs
- Review code comments
- Check Next.js docs: https://nextjs.org/docs
- Check Prisma docs: https://prisma.io/docs

## Happy Building! 🚀
