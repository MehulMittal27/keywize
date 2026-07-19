# Twilio setup

This document covers the Keywize customer-inbound phone stub. Live sandbox vendor calls use a separate provider path documented in [`ELEVENLABS_SETUP.md`](ELEVENLABS_SETUP.md#live-sandbox-test-procedure).

## Goal

A caller dials a normal phone number. Twilio receives the call and sends the inbound voice webhook to the Keywize app at `/api/twilio/inbound`. The route returns TwiML that greets the caller before the future ElevenLabs intake agent or Twilio Media Stream is connected.

## Prerequisites

- A Twilio account with billing enabled or trial credit.
- A deployed Keywize app with a public HTTPS URL, for example `https://YOUR_DEPLOYED_APP_URL`.
- No real credentials, user addresses, vendor phone numbers, or personal phone numbers should be committed to the repository.

## Buy a Twilio phone number

1. Sign in to the Twilio Console.
2. Open **Phone Numbers** -> **Manage** -> **Buy a number**.
3. Filter for numbers with **Voice** capability.
4. Choose a number and complete the purchase.
5. Store the number only in your local environment or deployment settings as a placeholder such as `+1XXXXXXXXXX`. Do not commit a real number.

## Configure the inbound voice webhook

1. In Twilio Console, open **Phone Numbers** -> **Manage** -> **Active numbers**.
2. Select the Keywize phone number.
3. In **Voice Configuration**, set **A call comes in** to **Webhook**.
4. Enter this URL, replacing the host with the deployed app URL:

```txt
https://YOUR_DEPLOYED_APP_URL/api/twilio/inbound
```

5. Set the HTTP method to `POST`.
6. Save the phone number configuration.

## Local development with ngrok or another tunnel

Twilio must reach a public HTTPS URL. For local testing, expose the Next.js dev server through a tunnel and use the tunnel URL in the Twilio webhook field:

```txt
https://YOUR_TUNNEL_HOST/api/twilio/inbound
```

Keep tunnel URLs out of committed files.

## Environment placeholders

Use placeholders in examples and commit only template values. Real values belong in `.env.local` or deployment secrets.

```bash
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_WEBHOOK_URL=https://YOUR_DEPLOYED_APP_URL/api/twilio/inbound
```

## Live sandbox boundary

Keywize live sandbox does not use `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, or Twilio's REST API to start outbound calls. The server calls ElevenLabs' Twilio outbound endpoint with an ElevenLabs-linked phone number. Check ElevenLabs Conversations first. Twilio logs appear only in the Twilio project that owns the linked outbound leg or destination inbound leg, which may not be the project configured for this inbound stub.

Changing the app's Twilio account alone does not update live sandbox outbound telephony. For an outbound provider-account change, link or import the new account's number inside ElevenLabs, update `ELEVENLABS_AGENT_PHONE_NUMBER_ID` in the active deployment environment, and redeploy.

If a team-controlled Twilio number is used as a live sandbox destination, do not point it at `/api/twilio/inbound`. Configure its **A call comes in** webhook/TwiML as a multi-turn Vendor A/B/C persona and verify it manually. A default Twilio trial/demo prompt, static "press any key to execute your code" application, or immediate hangup is not a vendor persona and cannot produce a Keywize quote webhook. Follow the readiness gate and both supported destination paths in the ElevenLabs setup guide.

## MVP behavior

The current webhook returns simple TwiML:

```xml
<Response>
  <Say>Thanks for calling Keywize. We will connect you to our lockout intake agent.</Say>
</Response>
```

Future work will connect this customer-inbound call to the ElevenLabs lockout intake agent or a Twilio Media Stream. Until then, the route speaks two static messages and ends the call. It must not be used as a sandbox vendor destination.

## Demo fallback

If real phone integration is not ready, show the webhook stub and run the full negotiation loop through the web demo with simulated vendors.
