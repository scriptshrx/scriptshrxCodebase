# Twilio Setup for ScriptishRx

## Required Environment Variables (Render)

To enable outbound calls, set these environment variables in your Render dashboard:

### Option 1: Using Account SID + Auth Token (Recommended)
```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  (your Twilio phone number)
```

### Option 2: Using API Key + Secret (More Secure)
```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_API_KEY_SID=your_api_key_sid_here
TWILIO_API_KEY_SECRET=your_api_key_secret_here
TWILIO_PHONE_NUMBER=+1234567890  (your Twilio phone number)
```

## Where to Find These Values

1. **TWILIO_ACCOUNT_SID** & **TWILIO_AUTH_TOKEN**
   - Go to https://console.twilio.com
   - Your Account SID and Auth Token are displayed on the dashboard

2. **TWILIO_API_KEY_SID** & **TWILIO_API_KEY_SECRET** (Recommended for production)
   - Go to https://console.twilio.com/account/keys-credentials/api-keys
   - Create a new API Key and copy the SID and Secret

3. **TWILIO_PHONE_NUMBER**
   - Go to https://console.twilio.com/phone-numbers/incoming
   - Copy the E.164 format number (e.g., +12025551234)

## Setup Steps

1. Log in to your Render dashboard: https://dashboard.render.com
2. Go to your backend service settings
3. Click "Environment" tab
4. Add the environment variables above
5. Save and redeploy your backend

## Testing

After setting the environment variables:
1. Restart the backend on Render
2. Try making an outbound call from the Voice Agent UI
3. Check the Render logs for any connection errors

## Troubleshooting

- **"Account SID not found"**: Make sure TWILIO_ACCOUNT_SID is set in Render environment
- **"No Twilio phone number configured"**: Make sure TWILIO_PHONE_NUMBER is set
- **"Twilio credentials incomplete"**: Provide either (API_KEY_SID + API_KEY_SECRET) OR AUTH_TOKEN

## Alternative: Per-Tenant Twilio Config

Instead of global environment variables, you can configure Twilio per organization via the API:

**PATCH /api/organization/info**
```json
{
  "twilioConfig": {
    "accountSid": "your_sid",
    "authToken": "your_token",
    "phoneNumber": "+1234567890"
  }
}
```

This allows different organizations to use different Twilio accounts.
