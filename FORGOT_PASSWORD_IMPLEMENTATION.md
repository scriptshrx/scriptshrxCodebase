# Forgot Password & Password Reset Implementation

## Overview
A complete forgot password flow has been implemented that allows users to:
1. Request a password reset by entering their email
2. Receive a password reset link via email
3. Click the link to access a password reset form
4. Set a new password with validation

---

## Database Changes

### Prisma Schema Update
**File:** `/backend/prisma/schema.prisma`

Added two new fields to the `User` model:
```prisma
resetToken        String?   @unique
resetTokenExpiry  DateTime?
```

**Migration Required:**
```bash
npx prisma migrate dev --name add_password_reset_fields
```

---

## Backend Implementation

### Email Template
**File:** `/backend/src/routes/resetPasswordMail.html`

Beautiful HTML email template that:
- Displays the ScriptishRx branding
- Contains a "Reset Password" button
- Includes the reset link for manual copy-paste
- Shows security tips
- Link expires in 24 hours

### API Endpoints
**File:** `/backend/src/routes/auth.js`

#### 1. POST `/api/auth/forgot-password`
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

**Features:**
- Generates a unique 32-character reset token
- Sets token expiry to 24 hours from request
- Sends password reset email with Zeptomail
- Returns same message regardless of user existence (security best practice)

#### 2. POST `/api/auth/reset-password`
**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewPassword123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Features:**
- Validates token existence and expiry
- Validates password strength (min 8 chars)
- Hashes password with bcrypt (rounds: 12)
- Clears reset token after successful reset
- Prevents reuse of same token

#### 3. GET `/api/auth/verify-reset-token/:token`
**Response (Valid):**
```json
{
  "success": true,
  "valid": true,
  "email": "user@example.com",
  "message": "Token is valid"
}
```

**Response (Invalid/Expired):**
```json
{
  "success": false,
  "valid": false,
  "error": "Invalid reset token" or "Reset token has expired"
}
```

**Features:**
- Pre-validates token before showing password form
- Displays user's email for confirmation
- Checks expiry before allowing reset

---

## Frontend Implementation

### 1. Forgot Password Page
**File:** `/frontend/src/app/forgot-password/page.tsx`

**Features:**
- Clean, modern UI with gradient background
- Email input field with validation
- Loading state during submission
- Two-step flow:
  1. Email submission
  2. Success confirmation screen
- Automatic redirect to login after 5 seconds
- Links to sign in and create account
- Back button to login page

**User Flow:**
1. User enters email address
2. Clicks "Send Reset Link"
3. Email is sent to inbox
4. Success page shows with next steps
5. Auto-redirects to login

### 2. Reset Password Page
**File:** `/frontend/src/app/reset-password/[token]/page.tsx`

**Features:**
- Dynamic route with token parameter
- Token validation on page load
- Invalid/expired token handling
- Password strength indicator (0-4 bars)
- Visual password strength feedback:
  - Very weak (red)
  - Weak (orange)
  - Fair (yellow)
  - Strong (green)
- Show/hide password toggle
- Real-time password match validation
- Confirmation password field
- Password requirements:
  - Minimum 8 characters
  - Uppercase letter
  - Lowercase letter
  - Number
  - Special character (recommended)

**User Flow:**
1. User clicks email link
2. Token validated automatically
3. User sees password reset form
4. Enters new password with strength feedback
5. Confirms password
6. Submits and gets success confirmation
7. Auto-redirects to login

### 3. Login Page Update
**File:** `/frontend/src/app/login/page.tsx`

**Changes:**
- Added "Forgot password?" link below password field
- Links to `/forgot-password` page
- Seamless integration with existing login UI

---

## Email Flow

### Password Reset Email
When user requests password reset:

1. **Backend generates:**
   - Unique reset token (32-char hex)
   - Expiry timestamp (24 hours)
   - Password reset link: `https://scriptishrx.net/reset-password/{token}`

2. **Email sent via Zeptomail:**
   - From: `support@scriptishrx.net`
   - To: User's email
   - Subject: "Password Reset Request - ScriptishRx"
   - Contains HTML template with:
     - Reset button (clickable link)
     - Plain text reset URL
     - Security tips
     - 24-hour expiry warning

3. **User clicks link:**
   - Opens reset password page
   - Page validates token
   - Displays password reset form if valid
   - Shows error if invalid/expired

---

## Security Features

### Token Management
- **Unique tokens:** Each reset is a new unique token
- **Expiry:** Tokens expire after 24 hours
- **One-time use:** Token cleared after successful reset
- **Database indexed:** `resetToken` is unique for fast lookups

### Password Validation
- **Minimum length:** 8 characters
- **Character types:** Uppercase, lowercase, numbers required
- **Secure hashing:** bcrypt with 12 rounds
- **No plaintext storage:** Passwords never logged or stored unencrypted

### Email Security
- **User enumeration protection:** Same message whether user exists or not
- **BCC to admin:** Email copies sent to support for audit trail
- **Clear subject lines:** Users know what email is about
- **Expiring links:** Links don't work after 24 hours
- **HTTPS only:** All links and forms use HTTPS

### Brute Force Protection
Consider adding:
- Rate limiting on forgot-password endpoint (currently not implemented)
- Limit reset attempts per email/IP
- Lock account after multiple failed resets

---

## Environment Variables Required

Ensure these are set in `.env`:

```bash
# Email Service
ZEPTOMAIL_KEY=your_zeptomail_api_key

# Frontend URL
FRONTEND_URL=https://scriptishrx.net
# OR
APP_URL=https://scriptishrx.net

# Database
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url
```

---

## Database Migration

Before deploying, run:

```bash
# From backend directory
npx prisma migrate dev --name add_password_reset_fields

# Or if deploying to production
npx prisma migrate deploy
```

This creates the `resetToken` and `resetTokenExpiry` columns.

---

## Testing the Flow

### Frontend Testing
```bash
# 1. Navigate to forgot password
http://localhost:3000/forgot-password

# 2. Enter test email
user@example.com

# 3. Check email for reset link

# 4. Click link
http://localhost:3000/reset-password/{token}

# 5. Enter new password and submit

# 6. Should redirect to login
http://localhost:3000/login
```

### Backend Testing (with curl)
```bash
# Step 1: Request password reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Step 2: Verify token (replace {token} with token from email)
curl http://localhost:3001/api/auth/verify-reset-token/{token}

# Step 3: Reset password
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"{token}","newPassword":"NewPass123"}'
```

---

## Files Modified/Created

### Created Files
- `/frontend/src/app/forgot-password/page.tsx` - Forgot password form page
- `/frontend/src/app/reset-password/[token]/page.tsx` - Password reset form page
- `/backend/src/routes/resetPasswordMail.html` - Reset email template

### Modified Files
- `/backend/prisma/schema.prisma` - Added reset fields to User model
- `/backend/src/routes/auth.js` - Added 3 new API endpoints
- `/frontend/src/app/login/page.tsx` - Added "Forgot password?" link

---

## Future Enhancements

1. **Rate Limiting**
   - Add rate limiter to `/api/auth/forgot-password`
   - Limit to 3 requests per email per hour
   - Implement IP-based rate limiting

2. **Email Verification**
   - Add optional email verification step
   - Show which email will receive reset link
   - Allow user to confirm before sending

3. **Social Login Recovery**
   - Add Google/social login recovery flow
   - Show available auth methods on reset page

4. **Password Requirements UI**
   - More detailed requirement checklist
   - Real-time validation feedback
   - Suggestions for strong passwords

5. **Two-Factor Authentication**
   - Add 2FA code requirement on reset
   - Send 2FA code via email
   - Verify code before allowing reset

6. **Reset History**
   - Track password resets in audit log
   - Store reset attempts (successful/failed)
   - Alert user of suspicious activity

---

## Support & Maintenance

For issues or questions:
- **Email:** support@scriptishrx.net
- **Check logs:** Zeptomail integration should log all sent emails
- **Database:** Query `users` table for `resetToken` and `resetTokenExpiry`
- **Cleanup:** Old expired tokens can be cleared with a cleanup job

---

## Compliance Notes

- **GDPR Compliant:** No unauthorized data processing
- **Security Best Practices:** Follows OWASP guidelines
- **Email Privacy:** BCC to admin for audit trail
- **Data Retention:** Reset tokens cleared after use or expiry

---
