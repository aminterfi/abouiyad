# Email Integration Plan for GestionPro

## Overview
- **Project**: GestionPro - Multi-tenant business management platform
- **Current State**: No email functionality; email data collected but not sent
- **Tech Stack**: Next.js 16, React 19, Supabase, Zustand, Tailwind CSS 4
- **Backend**: Supabase-only (no API routes currently)

## Use Cases Identified
1. Invoice email delivery to clients
2. Account notifications
3. Password reset emails
4. Payment confirmation emails

## Recommended Services

### 1. Resend (Recommended)
- **Pros**: Best Next.js integration, excellent DX, generous free tier (3,000 emails/month), React Email library support
- **Cons**: Limited European data centers
- **Pricing**: Free tier + $0.0095/email after

### 2. SendGrid
- **Pros**: Enterprise-grade, reliable, excellent deliverability
- **Cons**: More complex setup, higher learning curve
- **Pricing**: Free tier (100 emails) + $14.95/month base

### 3. Postmark
- **Pros**: Fast, excellent for transactional emails, good analytics
- **Cons**: Less feature-rich for marketing
- **Pricing**: $9/month for 10,000 emails

### 4. Mailgun
- **Pros**: Flexible API, good deliverability, pay-as-you-go
- **Cons**: Requires more setup
- **Pricing**: Pay-as-you-go starting $0.80/1000 emails

## Implementation Steps

### Phase 1: Service Setup
1. Choose Resend (recommended for this stack)
2. Create account and get API key
3. Add RESEND_API_KEY to environment variables
4. Verify sender domain/email

### Phase 2: Backend Integration
1. Create API route: `app/api/emails/send/route.ts`
2. Add SUPABASE_SERVICE_ROLE_KEY to env
3. Create email sending utility in `lib/`
4. Implement email queue with retry logic

### Phase 3: Email Templates
1. Install @react-email/components
2. Create invoice email template
3. Create notification templates
4. Add template localization (French)

### Phase 4: Database & Logging
1. Create email_logs table in Supabase
2. Track send status, failures, retries
3. Add audit trail functionality

### Phase 5: Integration Points
1. Add "Send by email" button to invoice view
2. Add email preference settings per company
3. Implement batch sending for multiple invoices

## Files to Modify
- `.env.local` - Add API keys
- `lib/email.ts` - New email utility
- `app/api/emails/send/route.ts` - New API route
- `app/[slug]/dashboard/factures/page.tsx` - Add email button

## Verification
1. Test email sending with single invoice
2. Verify email deliverability
3. Test error handling and retries
4. Verify multi-tenant isolation