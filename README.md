# QP Link - Quick Payment Links SaaS

A full-stack SaaS application for creating quick payment links with product images, QR codes, and analytics tracking.

## Features

- **User Authentication**: Email/password login with NextAuth.js
- **Payment Links**: Create shareable payment links with product details
- **Image Upload**: Upload product images to Cloudflare R2
- **Short URLs**: Auto-generated short links for easy sharing
- **QR Codes**: Automatic QR code generation for each product
- **Stripe Integration**: Secure payment processing via Stripe Payment Links API
- **Analytics**: Track clicks, unique visitors, device types, countries, and purchases
- **Dashboard**: Manage all your payment links in one place
- **Settings**: Update profile, change password, manage billing

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Storage**: Cloudflare R2 (S3-compatible)
- **Styling**: TailwindCSS
- **Deployment**: Vercel (frontend), Neon/Supabase (database), Cloudflare R2 (storage)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account
- Cloudflare R2 bucket
- Vercel account (for deployment)

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/qplink"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="qplink-images"
R2_PUBLIC_URL="https://your-bucket.r2.dev"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 4. Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Set up webhooks:
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

### 5. Cloudflare R2 Setup

1. Create a Cloudflare account
2. Go to R2 Object Storage
3. Create a new bucket (e.g., `qplink-images`)
4. Create an API token with R2 permissions
5. Configure public access for the bucket
6. Update environment variables with your credentials

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### User
- id, name, email, password, createdAt, updatedAt
- Relations: products, accounts, sessions

### Product
- id, userId, name, description, price, imageUrl, shortId, stripeUrl, createdAt, updatedAt
- Relations: user, analytics, payments

### Analytics
- id, productId, ip, country, userAgent, deviceType, timestamp
- Relations: product

### Payment
- id, productId, stripePaymentId, amount, status, timestamp
- Relations: product

## API Routes

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/[...nextauth]` - NextAuth.js handlers

### Products
- `GET /api/products/[shortId]` - Get product by short ID (public)

### Analytics
- `POST /api/analytics/track` - Track page view (rate-limited)

### User
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/password` - Change password

### Webhooks
- `POST /api/stripe/webhook` - Stripe webhook handler

## Server Actions

### Products
- `createProduct(formData)` - Create new product with image upload
- `updateProduct(id, formData)` - Update existing product
- `deleteProduct(id)` - Delete product and image
- `getProducts()` - Get all user products
- `getProduct(id)` - Get single product

### Analytics
- `getProductAnalytics(productId)` - Get detailed analytics for a product

## Deployment

### Vercel Deployment

1. Push your code to GitHub

2. Import project to Vercel:
   ```bash
   vercel
   ```

3. Add environment variables in Vercel dashboard

4. Deploy:
   ```bash
   vercel --prod
   ```

### Database (Neon or Supabase)

**Option A: Neon**
1. Create account at https://neon.tech
2. Create a new project
3. Copy connection string to `DATABASE_URL`

**Option B: Supabase**
1. Create account at https://supabase.com
2. Create a new project
3. Get connection string from Settings → Database
4. Update `DATABASE_URL`

### Cloudflare R2

1. Ensure your R2 bucket is configured for public access
2. Update `R2_PUBLIC_URL` to your bucket's public URL
3. Verify CORS settings allow your domain

### Post-Deployment

1. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Update Stripe webhook URL to your production domain

3. Test the full flow:
   - Sign up
   - Create a payment link
   - Visit the public link
   - Complete a test payment
   - Check analytics

## Project Structure

```
├── actions/              # Server actions
│   ├── analytics.ts
│   └── products.ts
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   ├── dashboard/       # Dashboard pages
│   ├── p/[shortId]/     # Public product pages
│   ├── login/           # Auth pages
│   ├── signup/
│   ├── settings/
│   └── page.tsx         # Landing page
├── components/           # React components
│   ├── ui/              # UI components
│   ├── layout/          # Layout components
│   └── dashboard/       # Dashboard components
├── lib/                  # Utility libraries
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   ├── stripe.ts        # Stripe client
│   ├── r2.ts            # R2 storage
│   ├── qr.ts            # QR code generation
│   └── utils.ts         # Utilities
├── prisma/
│   └── schema.prisma    # Database schema
└── types/               # TypeScript types
```

## Security Features

- Server-side input validation with Zod
- CSRF protection via NextAuth
- Rate limiting on analytics endpoint
- Hashed passwords with bcrypt
- Protected dashboard routes via middleware
- Secure webhook signature verification

## Analytics Tracking

Analytics are tracked when users visit `/p/[shortId]`:

- **Total Clicks**: Every page view
- **Unique Visitors**: Based on unique IP addresses
- **Device Type**: Mobile, tablet, or desktop
- **Country**: Derived from IP geolocation
- **Purchases**: Tracked via Stripe webhooks

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Database Commands

```bash
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev     # Create and apply migration
npx prisma migrate reset   # Reset database
npx prisma generate        # Generate Prisma Client
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if database is running
- Ensure SSL mode is configured correctly

### Image Upload Issues
- Verify R2 credentials are correct
- Check bucket permissions
- Ensure CORS is configured

### Stripe Webhook Issues
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Verify webhook secret matches
- Check webhook event types are configured

### Authentication Issues
- Ensure `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
