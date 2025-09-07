// Cloud Storage Configuration
// Add your API keys and configuration here

export const cloudStorageConfig = {
  googleDrive: {
    clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || 'YOUR_GOOGLE_DRIVE_CLIENT_ID',
    clientSecret: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_SECRET || 'YOUR_GOOGLE_DRIVE_CLIENT_SECRET',
    apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || 'YOUR_GOOGLE_DRIVE_API_KEY',
    scope: 'https://www.googleapis.com/auth/drive.file'
  },
  oneDrive: {
    clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID || 'YOUR_ONEDRIVE_CLIENT_ID',
    clientSecret: import.meta.env.VITE_ONEDRIVE_CLIENT_SECRET || 'YOUR_ONEDRIVE_CLIENT_SECRET',
    redirectUri: import.meta.env.VITE_ONEDRIVE_REDIRECT_URI || window.location.origin
  },
  dropbox: {
    appKey: import.meta.env.VITE_DROPBOX_APP_KEY || 'YOUR_DROPBOX_APP_KEY',
    redirectUri: import.meta.env.VITE_DROPBOX_REDIRECT_URI || window.location.origin
  }
};

// Instructions for setting up cloud storage providers:

/*
## Google Drive Setup:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable Google Drive API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Set application type to "Web application"
6. Add your domain to authorized origins
7. Add your redirect URI to authorized redirect URIs
8. Copy Client ID and API Key to environment variables

## OneDrive Setup:
1. Go to Azure Portal: https://portal.azure.com/
2. Register a new application
3. Set redirect URI to your app's URL
4. Grant Files.ReadWrite.All permission
5. Copy Application (client) ID to environment variables

## Dropbox Setup:
1. Go to Dropbox App Console: https://www.dropbox.com/developers/apps
2. Create a new app
3. Set OAuth 2 type to "Full Dropbox"
4. Add your redirect URI
5. Copy App key to environment variables

## Environment Variables:
Create a .env file in your project root:

VITE_GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_DRIVE_API_KEY=your_google_api_key
VITE_ONEDRIVE_CLIENT_ID=your_onedrive_client_id
VITE_DROPBOX_APP_KEY=your_dropbox_app_key

Note: All environment variables must start with VITE_ for Vite to expose them to the browser
*/
