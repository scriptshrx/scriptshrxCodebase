# Forgot Password - Quick Setup Guide

## What Was Implemented

A complete **forgot password** and **password reset** flow using email verification tokens.

---

## Installation & Deployment Steps

### Step 1: Database Migration (Required ⚠️)

```bash
cd backend
npx prisma migrate dev --name add_password_reset_fields
```

This adds:
- `resetToken` - Unique reset token (32-char hex)
- `resetTokenExpiry` - When token expires (24 hours from creation)

### Step 2: Verify Environment Variables

Check your `.env` file in backend:

```bash
# Must have Zeptomail configured
ZEPTOMAIL_KEY=your_api_key_here

# Frontend URL for reset link
FRONTEND_URL=https://scriptishrx.net
# OR
APP_URL=https://scriptishrx.net
```

### Step 3: Restart Services

```bash
# Backend
npm restart

# Frontend (if using dev server)
npm run dev
```

---

## User Journey

### User Forgot Password

1. **User clicks "Forgot Password?"** on login page
   - Link: `/forgot-password`

2. **User enters email**
   - System checks if email exists (silently fails if not)

3. **Email is sent**
   - From: `support@scriptishrx.net`
   - Contains: "Reset Password" button
   - Link valid: 24 hours

4. **User clicks email link**
   - Opens: `/reset-password/{token}`
   - Auto-validates token

5. **User sets new password**
   - Requirements: 8+ chars, upper/lower/number
   - Shows strength indicator
   - Confirm password match

6. **Password updated**
   - Auto-redirects to login
   - User logs in with new password

---

## API Endpoints

### 1. Request Password Reset
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

---

### 2. Verify Reset Token
```
GET /api/auth/verify-reset-token/{token}
```

**Response (Valid):**
```json
{
  "success": true,
  "valid": true,
  "email": "user@example.com"
}
```

---

### 3. Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "the_token_from_email",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

---

## Pages Added

| Page | Route | Purpose |
|------|-------|---------|
| Forgot Password Form | `/forgot-password` | Enter email to request reset |
| Reset Password Form | `/reset-password/[token]` | Set new password with token |

---

## Key Features

✅ **Email-based verification** - Reset link sent to user's email  
✅ **24-hour expiry** - Tokens expire for security  
✅ **One-time use** - Token deleted after reset  
✅ **Password strength** - Visual strength meter  
✅ **Token validation** - Verified before showing form  
✅ **Beautiful UI** - Consistent with existing design  
✅ **Error handling** - Clear messages for all scenarios  
✅ **Auto-redirect** - Smooth flow after completion  

---

## Testing

### 1. Test the Flow Manually
```
1. Go to: http://localhost:3000/login
2. Click: "Forgot password?"
3. Enter: Your test email
4. Check: Email inbox for reset link
5. Click: Reset link in email
6. Enter: New password
7. Submit: Should redirect to login
8. Login: With new password
```

### 2. Test with curl (Backend)
```bash
# Request reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify token (get token from email)
curl http://localhost:3001/api/auth/verify-reset-token/your_token_here

# Reset password
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"your_token_here","newPassword":"NewPass123"}'
```

---

## Files Changed

### New Files Created
- `frontend/src/app/forgot-password/page.tsx` - Forgot password page
- `frontend/src/app/reset-password/[token]/page.tsx` - Reset password page  
- `backend/src/routes/resetPasswordMail.html` - Email template

### Modified Files
- `backend/prisma/schema.prisma` - Added reset fields
- `backend/src/routes/auth.js` - Added 3 API endpoints
- `frontend/src/app/login/page.tsx` - Added forgot password link

---

## Security Checklist

- ✅ Passwords hashed with bcrypt (rounds: 12)
- ✅ Tokens are unique and random (32-char hex)
- ✅ Tokens expire after 24 hours
- ✅ Tokens are one-time use only
- ✅ Same response for existing/non-existing users
- ✅ Email sent with BCC to admin
- ✅ No passwords logged or exposed
- ✅ HTTPS enforced in production

---

## Troubleshooting

### Email Not Received
- ✅ Check `ZEPTOMAIL_KEY` is set in `.env`
- ✅ Check backend logs for email errors
- ✅ Verify user email in database
- ✅ Check spam folder

### Token Invalid/Expired
- ✅ Link is valid for 24 hours only
- ✅ Link can only be used once
- ✅ User must request new link to try again

### Password Validation Fails
- ✅ Minimum 8 characters required
- ✅ Must have uppercase letter (A-Z)
- ✅ Must have lowercase letter (a-z)
- ✅ Must have number (0-9)

### Database Error
- ✅ Run migration: `npx prisma migrate dev`
- ✅ Check `resetToken` and `resetTokenExpiry` exist in `users` table
- ✅ Verify database connection

---

## Database Cleanup (Optional)

Remove expired reset tokens periodically:

```sql
-- Find expired tokens
SELECT id, email, resetTokenExpiry 
FROM users 
WHERE resetTokenExpiry < NOW() AND resetToken IS NOT NULL;

-- Clear expired tokens
UPDATE users 
SET resetToken = NULL, resetTokenExpiry = NULL 
WHERE resetTokenExpiry < NOW();
```

---

## Support

For issues contact: **support@scriptishrx.net**

Documentation: See `FORGOT_PASSWORD_IMPLEMENTATION.md` for detailed guide.

---
