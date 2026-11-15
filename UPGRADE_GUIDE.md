# ECHO Odyssey — All Upgrades

## Run
1. Extract this ZIP. Open ECHO_ODYSSEY_ALL_UPGRADES in VS Code.
2. In `echo-config.js`, set your existing public Google OAuth Client ID (never a client secret).
3. In the terminal: `py -m http.server 8003`
4. Open http://localhost:8003/ in Chrome. In Google Cloud, authorize this exact JavaScript origin.

## What changed
- Polished Athena Mail welcome/sign-in panel.
- Sign out clears the Gmail access token, inbox, selected email and draft. Sign in with a different account to load its own inbox.
- Reply dictation via Chrome speech recognition; typed fallback and iPhone keyboard microphone.
- Reviewed replies can be sent using an **additional** Gmail send-only OAuth grant. The app asks for explicit confirmation.
- Responsive touch targets, sticky scrolling tabs and iPhone safe-area support.

## Important Google Cloud configuration
- Enable the Gmail API for your Google Cloud project.
- Existing read-only scope: `https://www.googleapis.com/auth/gmail.readonly`.
- To send replies, configure the additional `https://www.googleapis.com/auth/gmail.send` scope in Google Auth Platform's Data Access/OAuth consent configuration. The user is asked to grant it only when sending.
- If your app is in Testing, add each Gmail account to the OAuth test users list. Publishing for the public may require Google verification and a privacy policy.
- Only the public OAuth Client ID belongs in `echo-config.js`.

## Privacy limitations
This is a browser-only prototype, not a full multi-user account system. Quests, accessibility preferences and emergency-card data are still saved locally in the browser and **are not isolated per Google user**. Do not use a shared device for sensitive personal data. Gmail tokens are held in memory and messages are not saved to localStorage. Gmail access depends on Google's token and account-consent behavior.

## Test
1. Sign in to account A and read its inbox.
2. Sign out: inbox and draft should clear.
3. Sign in to account B: only B's Gmail should load.
4. Select a message, click Draft a reply, Dictate reply, then review the text.
5. Click Send reviewed reply, confirm, grant Gmail send permission, and verify in Gmail Sent.
6. On iPhone Safari, try typed reply/keyboard microphone if browser SpeechRecognition is unavailable.

**Never send a message without checking the recipient and contents.**
