# Google-only welcome screen
Open the app. The full-screen welcome page stays visible until Google OAuth succeeds and the Gmail profile confirms the connected email. Use Continue with Google for both new and returning users. Sign out / switch account in Athena Mail clears Gmail session and returns to the welcome screen.

While your OAuth app is in Testing mode, only Google Cloud approved test users can sign in. Public use may require Google verification for Gmail scopes.

This is a browser prototype: Google sign-in does not create a server-side ECHO account. Locally saved quests, reminders, achievements and settings are not yet isolated by Google account. Do not use a shared browser for private data.

Serve from localhost or HTTPS. If Python serves the parent folder, visit /ECHO_ODYSSEY_FINAL_LOGIN/ instead of /.
