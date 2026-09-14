# Resend email configuration

The backend now sends transactional email through the Resend HTTP API using Node 20+ native `fetch`. SMTP/Nodemailer is no longer required.

Set these backend environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM_NAME=UrbanStep
EMAIL_FROM_ADDRESS=verified-sender@your-domain.com
EMAIL_REPLY_TO=support@your-domain.com
ADMIN_NOTIFY_EMAIL=admin@your-domain.com
```

The sender domain/address must be verified in Resend. Email failures are logged and do not fail the originating signup, checkout, or order request. The implementation has a 10-second timeout and uses the existing retry utility.
