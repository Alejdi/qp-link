import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Base email sender with fallback to console logging
async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!resend) {
    // Development mode - log to console
    console.log('='.repeat(80))
    console.log('EMAIL NOTIFICATION (Development Mode - No API Key)')
    console.log('='.repeat(80))
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('='.repeat(80))
    return true
  }

  try {
    await resend.emails.send({
      from: 'QP Link <noreply@resend.dev>', // Change after domain verification
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Email sending failed:', error)
    return false
  }
}

// Email template wrapper
function emailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f8f8;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #21255B; font-size: 28px; font-weight: bold; margin: 0;">QP Link</h1>
          </div>

          <!-- Main Card -->
          <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${content}
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
              This is an automated notification from QP Link.
            </p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 16px 0 0 0;">
              &copy; ${new Date().getFullYear()} QP Link. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

// 1. Payment Received - Notify seller
export async function sendPaymentReceivedEmail(params: {
  sellerEmail: string
  sellerName: string
  invoiceName: string
  invoiceShortId: string
  amount: number
  netAmount: number
  buyerEmail: string
  isEscrow: boolean
}): Promise<boolean> {
  const { sellerEmail, sellerName, invoiceName, invoiceShortId, amount, netAmount, buyerEmail, isEscrow } = params

  const content = `
    <h2 style="color: #21255B; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
      ${isEscrow ? 'Payment Received (In Escrow)' : 'Payment Received'}
    </h2>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Hi ${sellerName},
    </p>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Great news! You've received a payment for your invoice.
    </p>

    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Invoice:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">${invoiceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Invoice ID:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">#${invoiceShortId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Buyer:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">${buyerEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Amount Paid:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">€${amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">You Receive:</td>
          <td style="padding: 8px 0; color: #10B981; font-size: 16px; font-weight: bold; text-align: right;">€${netAmount.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${isEscrow ? `
      <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #92400E; font-size: 14px; line-height: 20px; margin: 0; font-weight: 600;">
          ⚠️ Funds are held in escrow
        </p>
        <p style="color: #92400E; font-size: 14px; line-height: 20px; margin: 8px 0 0 0;">
          The payment is currently in escrow and will be released to your wallet after both you and the buyer confirm the transaction.
        </p>
      </div>
    ` : `
      <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #065F46; font-size: 14px; line-height: 20px; margin: 0; font-weight: 600;">
          ✓ Funds added to your wallet
        </p>
        <p style="color: #065F46; font-size: 14px; line-height: 20px; margin: 8px 0 0 0;">
          The payment has been credited to your QP Link wallet and is available for withdrawal.
        </p>
      </div>
    `}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #21255B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Dashboard
      </a>
    </div>
  `

  return sendEmail({
    to: sellerEmail,
    subject: `Payment Received - €${netAmount.toFixed(2)} for Invoice #${invoiceShortId}`,
    html: emailTemplate(content),
  })
}

// 2. Escrow Created - Send buyer confirmation link
export async function sendBuyerConfirmationEmail(params: {
  buyerEmail: string
  invoiceName: string
  amount: number
  confirmUrl: string
  sellerName?: string
}): Promise<boolean> {
  const { buyerEmail, invoiceName, amount, confirmUrl, sellerName } = params

  const content = `
    <h2 style="color: #21255B; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
      Payment Successful - Please Confirm Receipt
    </h2>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Thank you for your payment of <strong>€${amount.toFixed(2)}</strong> for <strong>${invoiceName}</strong>.
    </p>

    <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #1E40AF; font-size: 14px; line-height: 20px; margin: 0; font-weight: 600;">
        🔒 Your payment is protected by escrow
      </p>
      <p style="color: #1E40AF; font-size: 14px; line-height: 20px; margin: 8px 0 0 0;">
        Your funds are safely held until you confirm receipt of your purchase. This protects both you and the seller.
      </p>
    </div>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 24px 0;">
      <strong>What happens next?</strong>
    </p>

    <ol style="color: #6B7280; font-size: 14px; line-height: 24px; margin: 0 0 24px 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Wait to receive your purchase from ${sellerName || 'the seller'}</li>
      <li style="margin-bottom: 8px;">Once received and verified, click the confirmation link below</li>
      <li style="margin-bottom: 8px;">Funds will be released to the seller</li>
    </ol>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${confirmUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Confirm Receipt
      </a>
    </div>

    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #21255B; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
      ${confirmUrl}
    </p>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #EF4444; font-size: 14px; line-height: 20px; margin: 0; font-weight: 600;">
        ⚠️ Important
      </p>
      <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 8px 0 0 0;">
        Funds will automatically be released after 14 days if no action is taken. If you have an issue with your purchase, you can open a dispute from the confirmation page.
      </p>
    </div>
  `

  return sendEmail({
    to: buyerEmail,
    subject: `Confirm Receipt - ${invoiceName}`,
    html: emailTemplate(content),
  })
}

// 3. Escrow Released - Notify seller
export async function sendEscrowReleasedEmail(params: {
  sellerEmail: string
  sellerName: string
  invoiceName: string
  netAmount: number
  buyerEmail: string
}): Promise<boolean> {
  const { sellerEmail, sellerName, invoiceName, netAmount, buyerEmail } = params

  const content = `
    <h2 style="color: #10B981; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
      🎉 Escrow Funds Released!
    </h2>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Hi ${sellerName},
    </p>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Great news! The escrow for your sale has been released and the funds are now available in your wallet.
    </p>

    <div style="background-color: #D1FAE5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: #065F46; font-size: 14px; margin: 0 0 8px 0;">Amount Released</p>
      <p style="color: #10B981; font-size: 32px; font-weight: bold; margin: 0;">€${netAmount.toFixed(2)}</p>
    </div>

    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Invoice:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">${invoiceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Buyer:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">${buyerEmail}</td>
        </tr>
      </table>
    </div>

    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 24px 0;">
      You can now withdraw these funds to your bank account from your wallet.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard/wallet" style="display: inline-block; padding: 14px 32px; background-color: #21255B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Wallet
      </a>
    </div>
  `

  return sendEmail({
    to: sellerEmail,
    subject: `Funds Released - €${netAmount.toFixed(2)} Now Available`,
    html: emailTemplate(content),
  })
}

// 4. Dispute Opened - Notify seller
export async function sendDisputeOpenedEmail(params: {
  sellerEmail: string
  sellerName: string
  invoiceName: string
  amount: number
  buyerEmail: string
  reason: string
}): Promise<boolean> {
  const { sellerEmail, sellerName, invoiceName, amount, buyerEmail, reason } = params

  const content = `
    <h2 style="color: #EF4444; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
      ⚠️ Dispute Opened
    </h2>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Hi ${sellerName},
    </p>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      The buyer has opened a dispute for the following transaction:
    </p>

    <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #991B1B; font-size: 14px;">Invoice:</td>
          <td style="padding: 8px 0; color: #991B1B; font-size: 14px; font-weight: 600; text-align: right;">${invoiceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #991B1B; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: #991B1B; font-size: 14px; font-weight: 600; text-align: right;">€${amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #991B1B; font-size: 14px;">Buyer:</td>
          <td style="padding: 8px 0; color: #991B1B; font-size: 14px; font-weight: 600; text-align: right;">${buyerEmail}</td>
        </tr>
      </table>
    </div>

    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 16px 0;">
      <strong>Dispute Reason:</strong>
    </p>
    <p style="color: #374151; font-size: 14px; line-height: 20px; margin: 0 0 24px 0; padding: 16px; background-color: #F9FAFB; border-radius: 8px;">
      "${reason}"
    </p>

    <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #92400E; font-size: 14px; line-height: 20px; margin: 0;">
        <strong>What happens next?</strong>
      </p>
      <p style="color: #92400E; font-size: 14px; line-height: 20px; margin: 8px 0 0 0;">
        Our support team will review this case and contact you within 24 hours. The escrowed funds will remain held until the dispute is resolved.
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard/escrow" style="display: inline-block; padding: 14px 32px; background-color: #21255B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Escrow Details
      </a>
    </div>
  `

  return sendEmail({
    to: sellerEmail,
    subject: `Dispute Opened - ${invoiceName}`,
    html: emailTemplate(content),
  })
}

// 5. Withdrawal Completed - Notify user
export async function sendWithdrawalCompletedEmail(params: {
  userEmail: string
  userName: string
  amount: number
  accountLastFour: string
}): Promise<boolean> {
  const { userEmail, userName, amount, accountLastFour } = params

  const content = `
    <h2 style="color: #10B981; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
      ✓ Withdrawal Completed
    </h2>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Hi ${userName},
    </p>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Your withdrawal has been processed successfully.
    </p>

    <div style="background-color: #D1FAE5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: #065F46; font-size: 14px; margin: 0 0 8px 0;">Withdrawal Amount</p>
      <p style="color: #10B981; font-size: 32px; font-weight: bold; margin: 0;">€${amount.toFixed(2)}</p>
    </div>

    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Destination:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">Bank account ****${accountLastFour}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Processing Time:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">1-3 business days</td>
        </tr>
      </table>
    </div>

    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 24px 0;">
      The funds should appear in your bank account within 1-3 business days depending on your bank's processing time.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard/wallet" style="display: inline-block; padding: 14px 32px; background-color: #21255B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Wallet
      </a>
    </div>
  `

  return sendEmail({
    to: userEmail,
    subject: `Withdrawal Processed - €${amount.toFixed(2)}`,
    html: emailTemplate(content),
  })
}

// 6. Invoice Created - Send payment link to customer (optional)
export async function sendInvoiceEmail(params: {
  customerEmail: string
  invoiceName: string
  invoiceDescription: string
  amount: number
  paymentUrl: string
  sellerName: string
}): Promise<boolean> {
  const { customerEmail, invoiceName, invoiceDescription, amount, paymentUrl, sellerName } = params

  const content = `
    <h2 style="color: #21255B; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
      You've received an invoice
    </h2>

    <p style="color: #6B7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      ${sellerName} has sent you an invoice for payment.
    </p>

    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Invoice:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">${invoiceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Description:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; text-align: right;">${invoiceDescription}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">From:</td>
          <td style="padding: 8px 0; color: #21255B; font-size: 14px; font-weight: 600; text-align: right;">${sellerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 16px; font-weight: 600;">Amount Due:</td>
          <td style="padding: 8px 0; color: #10B981; font-size: 18px; font-weight: bold; text-align: right;">€${amount.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${paymentUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Pay Invoice
      </a>
    </div>

    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #21255B; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
      ${paymentUrl}
    </p>
  `

  return sendEmail({
    to: customerEmail,
    subject: `Invoice from ${sellerName} - €${amount.toFixed(2)}`,
    html: emailTemplate(content),
  })
}
