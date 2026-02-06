# Email Notifications & Auto-Release Cron Setup

This document explains the email notification system and auto-release cron job for the QP Link platform.

## Email Notification System

### Overview
The platform sends automated email notifications for all critical transaction events. In development mode (without Resend API key), emails are logged to the console. In production, emails are sent via Resend.

### Email Service (`lib/email-service.ts`)

The email service provides 6 notification types:

#### 1. Payment Received (Seller Notification)
**When**: After successful payment via Stripe
**To**: Seller
**Content**: Payment details, amount received, escrow status

```typescript
sendPaymentReceivedEmail({
  sellerEmail: 'seller@example.com',
  sellerName: 'John Doe',
  invoiceName: 'Product Purchase',
  invoiceShortId: 'ABC123',
  amount: 100.00,
  netAmount: 95.00,
  buyerEmail: 'buyer@example.com',
  isEscrow: true
})
```

#### 2. Buyer Confirmation Link (Escrow Protection)
**When**: After payment is placed in escrow
**To**: Buyer
**Content**: Confirmation instructions, escrow explanation, dispute option

```typescript
sendBuyerConfirmationEmail({
  buyerEmail: 'buyer@example.com',
  invoiceName: 'Product Purchase',
  amount: 100.00,
  confirmUrl: 'https://qplink.com/escrow/confirm?id=...',
  sellerName: 'John Doe'
})
```

#### 3. Escrow Released (Seller Notification)
**When**: After both parties confirm, or auto-release triggers
**To**: Seller
**Content**: Released amount, next steps (withdrawal)

```typescript
sendEscrowReleasedEmail({
  sellerEmail: 'seller@example.com',
  sellerName: 'John Doe',
  invoiceName: 'Product Purchase',
  netAmount: 95.00,
  buyerEmail: 'buyer@example.com'
})
```

#### 4. Dispute Opened (Seller Notification)
**When**: Buyer opens a dispute
**To**: Seller
**Content**: Dispute details, reason, next steps

```typescript
sendDisputeOpenedEmail({
  sellerEmail: 'seller@example.com',
  sellerName: 'John Doe',
  invoiceName: 'Product Purchase',
  amount: 100.00,
  buyerEmail: 'buyer@example.com',
  reason: 'Item not as described'
})
```

#### 5. Withdrawal Completed
**When**: Withdrawal is processed (admin action required)
**To**: User
**Content**: Amount, destination, processing time

```typescript
sendWithdrawalCompletedEmail({
  userEmail: 'user@example.com',
  userName: 'John Doe',
  amount: 95.00,
  accountLastFour: '1234'
})
```

#### 6. Invoice Email (Optional)
**When**: Seller wants to email invoice to customer
**To**: Customer
**Content**: Invoice details, payment link

```typescript
sendInvoiceEmail({
  customerEmail: 'customer@example.com',
  invoiceName: 'Consulting Services',
  invoiceDescription: 'Monthly consulting fee',
  amount: 500.00,
  paymentUrl: 'https://qplink.com/pay/ABC123',
  sellerName: 'John Doe'
})
```

### Email Integration Points

The email service is integrated at these key points:

1. **Payment received** ([app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts:263-284))
   - Escrow flow: Emails seller + buyer
   - Direct flow: Emails seller only

2. **Escrow released** ([app/api/escrow/confirm/route.ts](app/api/escrow/confirm/route.ts:173-196))
   - When buyer confirms receipt
   - Emails seller about fund release

3. **Dispute opened** ([app/api/escrow/confirm/route.ts](app/api/escrow/confirm/route.ts:252-276))
   - When buyer opens dispute
   - Emails seller with dispute details

4. **Auto-release** ([app/api/cron/auto-release-escrow/route.ts](app/api/cron/auto-release-escrow/route.ts))
   - When escrow auto-releases after 14 days
   - Emails seller about automatic release

### Development Mode

Without `RESEND_API_KEY` in `.env.local`, emails are logged to console:

```
================================================================================
EMAIL NOTIFICATION (Development Mode - No API Key)
================================================================================
To: seller@example.com
Subject: Payment Received - €95.00 for Invoice #ABC123
================================================================================
```

This allows testing the full flow without setting up email service.

### Production Setup

1. **Get Resend API Key**
   - Sign up at [resend.com](https://resend.com)
   - Create API key
   - Add to `.env.local`:
     ```
     RESEND_API_KEY=re_xxxxxxxxxxxxx
     ```

2. **Verify Domain** (Optional but recommended)
   - In Resend dashboard, add your domain
   - Add DNS records
   - Change `from` address in `lib/email-service.ts`:
     ```typescript
     from: 'QP Link <noreply@yourdomain.com>'
     ```

3. **Test Emails**
   - Complete a test transaction
   - Check Resend dashboard for delivery status
   - Check spam folder if not received

## Auto-Release Cron Job

### Overview
Escrow funds are automatically released to sellers after 14 days if no dispute is opened. This prevents funds from being held indefinitely.

### Cron Endpoint
**URL**: `/api/cron/auto-release-escrow`
**Method**: GET
**Auth**: Bearer token (CRON_SECRET)
**Schedule**: Every 6 hours

### How It Works

1. **Finds eligible escrows**
   - Status: `held`
   - `auto_release_at` <= current time
   - Limit: 100 per run

2. **Releases each escrow**
   - Calls `release_escrow` database function
   - Moves funds from `frozen_balance` to `balance`
   - Updates escrow status to `released`

3. **Logs events**
   - Creates `escrow_events` record
   - Logs activity in `activity_log`
   - Sends email to seller

4. **Returns summary**
   ```json
   {
     "success": true,
     "processed": 5,
     "successful": 5,
     "failed": 0
   }
   ```

### Vercel Cron Setup

The platform uses Vercel Cron (included in all plans).

**Configuration** ([vercel.json](vercel.json:8-12)):
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-release-escrow",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Schedule**: `0 */6 * * *` = Every 6 hours (at :00 minutes)
- 00:00 UTC
- 06:00 UTC
- 12:00 UTC
- 18:00 UTC

### Security

The cron endpoint requires authentication:

```typescript
const authHeader = req.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET || 'development-secret'

if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Setup**:
1. Generate a secure secret:
   ```bash
   openssl rand -hex 32
   ```

2. Add to `.env.local`:
   ```
   CRON_SECRET=your-generated-secret-here
   ```

3. Add to Vercel environment variables:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add `CRON_SECRET` with the same value
   - Apply to Production, Preview, and Development

### Manual Testing

You can manually trigger the cron job:

```bash
# Local testing
curl -H "Authorization: Bearer development-secret" \
  http://localhost:3000/api/cron/auto-release-escrow

# Production testing
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-domain.com/api/cron/auto-release-escrow
```

### Monitoring

**Vercel Dashboard**:
- Go to Deployments → Your deployment → Functions
- Click on the cron function to see execution logs
- Check for errors or successful runs

**Database Queries**:
```sql
-- Check escrows that will auto-release soon
SELECT
  id,
  amount,
  net_amount,
  auto_release_at,
  auto_release_at - NOW() as time_until_release
FROM escrows
WHERE status = 'held'
  AND auto_release_at IS NOT NULL
ORDER BY auto_release_at ASC;

-- Check recent auto-releases
SELECT *
FROM escrow_events
WHERE event_type = 'auto_released'
ORDER BY created_at DESC
LIMIT 10;
```

### Alternative Cron Services

If not using Vercel, you can use other cron services:

#### 1. GitHub Actions
Create `.github/workflows/cron.yml`:
```yaml
name: Auto-Release Escrow
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  auto-release:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger auto-release
        run: |
          curl -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/auto-release-escrow
```

#### 2. Cron-job.org
- Sign up at [cron-job.org](https://cron-job.org)
- Create new cron job
- URL: `https://your-domain.com/api/cron/auto-release-escrow`
- Add header: `Authorization: Bearer your-cron-secret`
- Schedule: `0 */6 * * *`

#### 3. EasyCron
- Sign up at [easycron.com](https://easycron.com)
- Similar setup as cron-job.org

## Database Functions

The auto-release system relies on the `release_escrow` database function.

**Function** (should be in your Supabase migrations):
```sql
CREATE OR REPLACE FUNCTION release_escrow(
  p_escrow_id UUID,
  p_actor_type TEXT,
  p_actor_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get escrow details
  DECLARE
    v_seller_id UUID;
    v_wallet_id UUID;
    v_net_amount DECIMAL;
  BEGIN
    SELECT seller_id, net_amount
    INTO v_seller_id, v_net_amount
    FROM escrows
    WHERE id = p_escrow_id AND status = 'held';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Escrow not found or already released';
    END IF;

    -- Get seller wallet
    SELECT id INTO v_wallet_id
    FROM wallets
    WHERE user_id = v_seller_id;

    -- Update escrow status
    UPDATE escrows
    SET
      status = 'released',
      released_at = NOW(),
      updated_at = NOW()
    WHERE id = p_escrow_id;

    -- Move funds from frozen to available
    UPDATE wallets
    SET
      balance = balance + v_net_amount,
      frozen_balance = frozen_balance - v_net_amount,
      updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Update transaction status
    UPDATE transactions
    SET status = 'completed', completed_at = NOW()
    WHERE invoice_id IN (
      SELECT invoice_id FROM escrows WHERE id = p_escrow_id
    ) AND status = 'pending';

    -- Log event
    INSERT INTO escrow_events (escrow_id, event_type, actor_type, actor_id)
    VALUES (p_escrow_id, 'released', p_actor_type, p_actor_id);
  END;
END;
$$;
```

## Testing the Full Flow

### 1. Create Test Invoice
1. Login to dashboard
2. Create new invoice
3. Copy payment link

### 2. Make Test Payment
1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any CVC

### 3. Check Emails (Dev Mode)
After payment, check terminal for:
```
================================================================================
EMAIL NOTIFICATION (Development Mode - No API Key)
================================================================================
To: seller@example.com
Subject: Payment Received (In Escrow) - €95.00 for Invoice #ABC123

To: buyer@example.com
Subject: Confirm Receipt - Product Purchase
================================================================================
```

### 4. Buyer Confirms Receipt
1. Copy the confirmation URL from terminal
2. Paste in browser
3. Click "Confirm Receipt"
4. Check terminal for escrow released email

### 5. Auto-Release (Optional)
1. Manually trigger cron:
   ```bash
   curl -H "Authorization: Bearer development-secret" \
     http://localhost:3000/api/cron/auto-release-escrow
   ```
2. Check terminal for release emails

## Troubleshooting

### Emails not sending in production
1. Check Resend API key is set
2. Check Resend dashboard for errors
3. Check spam folder
4. Verify domain (if using custom domain)

### Cron not running
1. Check Vercel deployment logs
2. Verify `vercel.json` is committed
3. Check environment variable `CRON_SECRET` is set
4. Try manual trigger to test endpoint

### Auto-release not working
1. Check escrow has `auto_release_at` set
2. Verify `release_escrow` function exists in database
3. Check database logs for errors
4. Manually trigger cron to see error messages

## Environment Variables Required

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Cron Job Security
CRON_SECRET=your-secure-random-string

# Already set
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXTAUTH_URL=https://your-domain.com
```

## Next Steps

1. ✅ Email notification system - **COMPLETED**
2. ✅ Auto-release cron job - **COMPLETED**
3. 🔄 Set up Resend API key for production
4. 🔄 Test full payment → escrow → release flow
5. 🔄 Monitor cron job execution in production
6. 🔄 Consider adding admin withdrawal completion endpoint with email notification
