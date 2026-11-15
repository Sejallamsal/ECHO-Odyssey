# ECHO Odyssey — Google Login Edition

This edition replaces the user-facing Google Client ID field with **Continue with Google**. It keeps Athena Mail and voice commands.

**Start with `GOOGLE_LOGIN_SETUP.md`** for the one-time developer configuration.

Run `py -m http.server 8003` in this folder and visit `http://localhost:8003/`.

The Google OAuth Client ID is app configuration. Each person selects their own Google account; Athena Mail only fetches that authorized Gmail inbox. Google testing/verification rules still apply.
