# ECHO Odyssey — Google login setup

## One-time setup (developer only)

1. Open `echo-config.js` in VS Code.
2. Replace `PASTE_YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE` with the **public OAuth Client ID** from Google Cloud Console > Google Auth Platform > Clients > your **Web application** client. It ends with `.apps.googleusercontent.com`. Do not include quotes inside the ID or use a client secret.
3. In Google Cloud, add `http://localhost:8003` to **Authorized JavaScript origins** for that same client. The browser token flow does not require a redirect URI.
4. While your OAuth app is in Testing, add each intended Google account to **Audience > Test users**. Make sure the `gmail.readonly` scope is configured.
5. Open a terminal in this folder and run `py -m http.server 8003`, then open `http://localhost:8003/` in Chrome.
6. Open **Mail** > **Continue with Google** and choose the account. Athena Mail displays the selected address and loads only that account's Gmail messages.

## Switching accounts

Select **Sign out / switch account**, then **Continue with Google** and choose another account. The previous messages are cleared from the UI. Google may remember which account was last used; use Google's account chooser to select another.

## Important

- The client ID is **public app configuration**, not a user login or secret. Every app deployment needs a valid client ID and matching authorized origin.
- Users sign in individually with Google and consent to Gmail read-only access; no user types a client ID.
- The app holds OAuth tokens and email messages in browser memory only. Refreshing the page requires signing in again.
- This is a browser-only prototype, **not a full app-wide account system**. Quests and preferences remain browser-local, not tied to the signed-in Google account. Do not share a browser profile if you need private local quest data.
- Public access to Gmail's restricted scope can require Google OAuth verification and potentially a security assessment. Testing mode limits which accounts can authorize.
- Do not publish a Google OAuth **client secret**. Never put secrets in frontend JavaScript.
- Voice commands, Vision, Hearing, Quest, Daily and Independence remain in the app.
