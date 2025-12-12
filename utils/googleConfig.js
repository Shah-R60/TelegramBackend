import { google } from "googleapis";

// Use environment variables instead of hardcoded values
const oauthClient = new google.auth.OAuth2(
   process.env.GOOGLE_CLIENT_ID,
   process.env.GOOGLE_CLIENT_SECRET,
    'postmessage' // This is correct for @react-oauth/google
);

export default oauthClient;