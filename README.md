# Event Planner AI

A full-stack Next.js application for AI-powered event planning that integrates with Google Calendar and Google Maps to coordinate schedules and suggest activities.

## Features

- 🤖 **AI-Powered Planning**: Chat with an AI assistant that helps coordinate events and suggests optimal times
- 📅 **Smart Scheduling**: Automatically analyzes participants' Google Calendars to find available time slots
- 🗺️ **Location Intelligence**: Discovers activities and venues using Google Maps and Places API
- 🔗 **Easy Sharing**: Create shareable links for events that participants can join seamlessly
- 👥 **Real-time Collaboration**: Participants can chat and provide preferences in real-time
- 📱 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Firebase Firestore
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: NVIDIA API (Llama 3.3 Nemotron)
- **APIs**: Google Calendar API, Google Maps API, Google Places API
- **Deployment**: Vercel-ready

## Prerequisites

Before setting up the project, you'll need to obtain API keys and configure services:

### 1. Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Generate a service account key for admin operations
4. Enable Authentication with Google provider

### 2. Google Cloud Setup
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Google Calendar API
   - Google Maps JavaScript API
   - Google Places API (New)
   - Geocoding API
3. Create credentials:
   - OAuth 2.0 Client IDs for web application
   - API Key for Maps/Places (restrict to your domain)

### 3. NVIDIA API
The NVIDIA API key is already provided in the code, but you can get your own at [NVIDIA Developer](https://developer.nvidia.com/).

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-planner-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in all the environment variables in `.env.local`:

   ```bash
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="your_private_key"

   # Google APIs
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key

   # NextAuth
   NEXTAUTH_SECRET=your_secret_here
   NEXTAUTH_URL=http://localhost:3000

   # App URLs
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Generate NextAuth Secret**
   ```bash
   openssl rand -base64 32
   ```

5. **Configure OAuth Redirect URIs**
   In Google Cloud Console, add these redirect URIs to your OAuth client:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### Creating an Event
1. Sign in with your Google account
2. Click "Create New Event" on the dashboard
3. Fill in event details, location, and preferences
4. Share the generated link with participants

### Joining an Event
1. Open the shared event link
2. Sign in with Google to connect your calendar
3. Chat with the AI to provide preferences
4. View suggested time slots and activities

### AI Assistant Features
- Ask about optimal meeting times
- Request activity suggestions for the location
- Discuss preferences and constraints
- Get recommendations based on group availability

## API Routes

- `GET /api/events` - Get user's events
- `POST /api/events` - Create new event
- `GET /api/events/[id]` - Get specific event
- `PUT /api/events/[id]` - Update event
- `POST /api/events/[id]/chat` - Send chat message to AI
- `POST /api/events/[id]/join` - Join event
- `GET /api/events/share/[shareLink]` - Get event by share link
- `POST /api/calendar/availability` - Analyze calendar availability

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to [Vercel](https://vercel.com)
   - Add all environment variables in Vercel dashboard
   - Deploy automatically

3. **Update OAuth Redirect URIs**
   Add your Vercel domain to Google OAuth settings:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

4. **Update Environment Variables**
   ```bash
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client configuration | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |
| `GOOGLE_CLIENT_ID` | OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Yes |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | Yes |
| `NVIDIA_API_KEY` | NVIDIA/OpenAI API key | Yes |
| `NEXTAUTH_SECRET` | NextAuth encryption secret | Yes |
| `NEXTAUTH_URL` | App base URL | Yes |

## Database Schema

### Collections

#### Users
```typescript
{
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Events
```typescript
{
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  participants: string[];
  location?: {
    address: string;
    coordinates: { lat: number; lng: number; };
  };
  preferredDates: Date[];
  finalizedDate?: Date;
  duration: number;
  preferences: EventPreferences;
  activities: Activity[];
  chatMessages: ChatMessage[];
  shareLink: string;
  status: 'planning' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
```

#### Chat Messages
```typescript
{
  id: string;
  eventId: string;
  userId?: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'system';
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email [your-email] or create an issue in the GitHub repository.

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Calendar integration with other providers (Outlook, Apple)
- [ ] Advanced AI scheduling with machine learning
- [ ] Event templates and recurring events
- [ ] Payment integration for paid events
- [ ] Team workspaces and organization features
