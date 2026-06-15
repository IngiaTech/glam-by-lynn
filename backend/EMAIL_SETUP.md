# Email Service Setup

The Glam by Lynn application includes a flexible email service that supports multiple providers.

## Configuration

Add the following environment variables to your `.env` file:

### Basic Configuration

```env
# Email Provider: console (dev), resend, or sendgrid
# Note: "smtp" is NOT implemented — only console, resend, and sendgrid work.
EMAIL_PROVIDER=console

# Sender identity. EMAIL_FROM must be a verified domain/sender with your provider.
EMAIL_FROM=noreply@glambylynn.com
EMAIL_FROM_NAME=Glam by Lynn
```

> ⚠️ The email service reads `EMAIL_FROM` (not `FROM_EMAIL`). The `FROM_EMAIL`
> setting in `app/core/config.py` is unrelated to outbound mail.

### Recipients & links (booking notifications)

```env
# Comma-separated recipients of internal notifications (e.g. "new booking to
# review"). If empty, no admin emails are sent (the customer email still goes out).
ADMIN_EMAILS=admin@glambylynn.com,lynn@glambylynn.com

# Used to build links in emails (e.g. the admin "Open in dashboard" button).
FRONTEND_URL=https://glambylynn.com
```

The customer "Follow up on WhatsApp" / "Call us" buttons and the admin
"WhatsApp customer" button use the business number stored under the
`whatsapp_phone_number` site setting — configured in the app under
**Admin → Settings**, not via env. If it's unset, those buttons are omitted
and the email still sends.

### Provider-Specific Configuration

#### Option 1: Console (Development)

No additional configuration needed. Emails will be printed to the console.

```env
EMAIL_PROVIDER=console
```

#### Option 2: Resend (Recommended for Production)

The `resend` package is included in `requirements.txt`, so no extra install is needed.

1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain and create an API key
3. Configure:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=bookings@glambylynn.com   # must be on the verified domain
```

#### Option 3: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Install the package: `pip install sendgrid` (not bundled in requirements.txt)
4. Configure:

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

## Email Templates

The service includes responsive HTML templates for:

### 1. Order Notification Emails
Sent automatically when an order is created (via FastAPI background tasks, so a
slow/failing provider never blocks or fails the order):
- **Customer** (`send_order_confirmation`) — confirms the order, summarises
  items/totals/delivery address, explains what happens next, and offers
  "Follow up on WhatsApp" + "Call us" buttons.
- **Team** (`send_order_admin_notification`) — sent to each `ADMIN_EMAILS`
  address with the customer's contact, order details, and "Call customer" /
  "WhatsApp customer" / "Open in dashboard" buttons.

### 2. Booking Notification Emails
Sent automatically when a booking is created (via FastAPI background tasks, so
a slow/failing provider never blocks or fails the booking):
- **Customer** (`send_booking_received_customer`) — confirms the request was
  received (pending, not yet confirmed), summarises the details, explains what
  happens next, and offers "Follow up on WhatsApp" + "Call us" buttons.
- **Team** (`send_booking_admin_notification`) — sent to each `ADMIN_EMAILS`
  address with the customer's contact, full booking details, an action
  checklist, and "Call customer" / "WhatsApp customer" / "Open in dashboard"
  buttons.

### 3. Vision Registration Confirmation Email
- Sent when someone registers interest in 2026 expansion
- Thanks them for their interest
- Lists selected areas of interest

## Email Service Usage

### In Code

```python
from app.services.email_service import email_service

# Send order confirmation
email_service.send_order_confirmation(
    to_email="customer@example.com",
    order_number="ORD-12345",
    customer_name="Jane Doe",
    order_items=[...],
    subtotal=Decimal("1000.00"),
    discount=Decimal("100.00"),
    delivery_fee=Decimal("200.00"),
    total=Decimal("1100.00"),
    delivery_address={...},
)

# Booking notifications are sent automatically on booking creation — see
# app/services/booking_notifications.py (scheduled from the create-booking
# route via BackgroundTasks). To send one directly:
email_service.send_booking_received_customer(
    to_email="customer@example.com",
    booking_number="BK202601150001",
    customer_name="Jane Doe",
    service_name="Bridal Makeup Package",
    booking_date=date(2026, 1, 15),
    location="Karen, Nairobi",
    subtotal=Decimal("5000.00"),
    deposit=Decimal("2500.00"),
    whatsapp_url="https://wa.me/2547...",   # optional
    call_number="2547...",                  # optional
)

# Send vision registration confirmation
email_service.send_vision_registration_confirmation(
    to_email="customer@example.com",
    full_name="Jane Doe",
    interests=["Full-service Salon", "Spa Treatments"],
)
```

## Testing

### Development Mode (Console)

In development, use `EMAIL_PROVIDER=console` to print emails to the console instead of sending them.

### Testing with Real Email Providers

1. **Resend**: Use their test mode to send to verified email addresses
2. **SendGrid**: Use sandbox mode for testing

## Email Design

All email templates feature:
- Responsive HTML design
- Plain text fallback
- Glam by Lynn branding (black/pink color scheme)
- Mobile-friendly layout
- Clear call-to-actions
- Professional footer with company info

## Future Email Templates

Templates to be added:
- Review request email (post-purchase)
- Newsletter confirmation
- Password reset
- Account verification
- Shipping confirmation with tracking
- Appointment reminders

## Troubleshooting

### Emails not sending

1. Check `EMAIL_PROVIDER` is set correctly
2. Verify API keys are correct
3. Check console/logs for error messages
4. Ensure required packages are installed (`resend` or `sendgrid`)

### Emails going to spam

1. Configure SPF, DKIM, and DMARC records for your domain
2. Use a verified domain with your email provider
3. Avoid spam trigger words in subject lines
4. Include unsubscribe link for marketing emails

## Production Checklist

- [ ] Choose email provider (Resend or SendGrid recommended)
- [ ] Set up domain verification
- [ ] Configure DNS records (SPF, DKIM, DMARC)
- [ ] Test all email templates
- [ ] Set up email monitoring/alerts
- [ ] Configure rate limiting if needed
- [ ] Add unsubscribe functionality for marketing emails
