# Voice Audit Backend

Backend server for Voice Audit application that processes voice/text input and integrates with Google Calendar, Tasks, and Gmail using Firebase authentication, Gemini AI, and Google OAuth2.

## Features

- ✅ Firebase Authentication integration
- ✅ Gemini AI for natural language processing
- ✅ Google Calendar event creation
- ✅ Google Tasks creation
- ✅ Gmail email sending
- ✅ OAuth2 token management with Firestore
- ✅ TypeScript with strict type checking
- ✅ RESTful API endpoints

## Tech Stack

- **Node.js** with **Express**
- **TypeScript** for type safety
- **Firebase Admin SDK** for authentication
- **Google Generative AI (Gemini)** for text processing
- **Google APIs** (Calendar, Tasks, Gmail)
- **Firestore** for token storage

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in all required values (see [SETUP.md](./SETUP.md) for detailed instructions)

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Main server file
│   ├── firebaseAdmin.ts         # Firebase Admin initialization
│   ├── routes/
│   │   ├── audio.route.ts       # Text processing endpoint
│   │   └── auth.route.ts        # OAuth2 endpoints
│   ├── services/
│   │   ├── gemini.service.ts    # Gemini AI integration
│   │   ├── googleOAuth.service.ts    # OAuth2 token management
│   │   ├── googleCalendar.service.ts # Calendar API
│   │   ├── googleTasks.service.ts    # Tasks API
│   │   ├── googleGmail.service.ts    # Gmail API
│   │   └── actionRouter.service.ts   # Route actions to services
│   └── middlewares/
│       └── firebaseAuth.ts      # Firebase token verification
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
├── SETUP.md                     # Detailed setup instructions
└── FLOWCHART.md                 # Application flow diagrams
```

## API Endpoints

### POST /api/process
Process text input and execute action (Calendar/Task/Email)

**Request:**
```json
{
  "text": "Schedule a meeting tomorrow at 2pm"
}
```

**Response:**
```json
{
  "success": true,
  "action": "calendar",
  "message": "Calendar event created successfully",
  "data": {
    "id": "event_id",
    "title": "Meeting",
    "start": "2024-01-15T14:00:00Z",
    "end": "2024-01-15T15:00:00Z"
  }
}
```

### GET /api/auth/google/url
Get Google OAuth2 authorization URL

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### GET /api/auth/google/callback
OAuth2 callback endpoint (handled by Google)

## Environment Variables

See [SETUP.md](./SETUP.md) for detailed setup instructions.

Required variables:
- `GEMINI_API_KEY` - Gemini API key
- `GOOGLE_CLIENT_ID` - Google OAuth2 client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth2 client secret
- `GOOGLE_REDIRECT_URI` - OAuth2 redirect URI
- `FIREBASE_SERVICE_ACCOUNT_PATH` - Path to Firebase service account JSON

## Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Flow Diagram

See [FLOWCHART.md](./FLOWCHART.md) for detailed flow diagrams of:
- Complete application flow
- OAuth2 authentication flow
- Text processing flow

## Setup Instructions

For detailed setup instructions including:
- Firebase configuration
- Gemini API setup
- Google OAuth2 setup
- Environment configuration

See [SETUP.md](./SETUP.md)

## License

ISC




