# Twilio setup

This is the phone path for Keywize.

## Goal

User calls a normal phone number. Twilio receives the call and forwards it to the Keywize intake flow.

## Steps

1. Create or log in to a Twilio account.
2. Buy a phone number with voice capability.
3. Set the inbound voice webhook to:

```txt
https://YOUR_DEPLOYED_APP_URL/api/twilio/inbound
```

4. Set method to `POST`.
5. Add these values to `.env.local`:

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WEBHOOK_URL=
```

## MVP behavior

For the hackathon MVP, the webhook can return simple TwiML first:

```xml
<Response>
  <Say>Thanks for calling Keywize. We will connect you to our lockout intake agent.</Say>
</Response>
```

Then connect the call to ElevenLabs or a media stream when ready.

## Demo fallback

If real phone integration is not ready, show the webhook stub and run the full negotiation loop through the web demo with simulated vendors.
