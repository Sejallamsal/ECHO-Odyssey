# Google account display

Open ECHO, choose Athena Mail, then Continue with Google. Once the Google OAuth flow succeeds, ECHO displays the actual connected Gmail address at the top of the app and in Athena Mail. The Gmail API's `users/me` endpoint returns the profile of the account that granted access, so inbox requests are tied to that token.

Sign out / switch account clears the Gmail access token, loaded inbox and reply draft, and resets the displayed email address. Choose Continue with Google again to connect another account.

IMPORTANT: While your OAuth app is in Google's Testing state, only approved test users can authorize Gmail. To support the general public, follow Google's publishing and verification process for restricted Gmail scopes. This update does not create a backend user account system. Quests, reminders, achievements and accessibility settings remain stored locally on the browser and are NOT separated by Google account.
