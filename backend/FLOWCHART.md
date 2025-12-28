# Application Flow Diagram

## Complete Application Flow

```mermaid
flowchart TD
    A[User speaks in Chrome Extension] --> B[Extension converts speech to text]
    B --> C[Frontend sends text to Backend<br/>POST /api/process]
    C --> D{Backend verifies<br/>Firebase token}
    D -->|Invalid| E[Return 401 Unauthorized]
    D -->|Valid| F[Backend sends text to Gemini API]
    F --> G[Gemini processes text<br/>and returns structured JSON]
    G --> H{Parse JSON<br/>action type}
    H -->|calendar| I[Google Calendar Service]
    H -->|task| J[Google Tasks Service]
    H -->|email| K[Google Gmail Service]
    H -->|unknown| L[Return error message]
    I --> M[Get OAuth2 access token<br/>from Firestore]
    J --> M
    K --> M
    M --> N{Token valid?}
    N -->|No/Expired| O[Refresh access token<br/>using refresh token]
    N -->|Yes| P[Call Google API]
    O --> P
    P --> Q{API call<br/>successful?}
    Q -->|Yes| R[Return success response<br/>to Frontend]
    Q -->|No| S[Return error response<br/>to Frontend]
    R --> T[Frontend displays<br/>success message]
    S --> U[Frontend displays<br/>error message]
    L --> U
    E --> U
```

## OAuth2 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Google
    participant Firestore

    User->>Frontend: Click "Connect Google"
    Frontend->>Backend: GET /api/auth/google/url<br/>(with Firebase token)
    Backend->>Backend: Generate OAuth2 URL
    Backend->>Frontend: Return authUrl
    Frontend->>User: Redirect to Google OAuth
    User->>Google: Authorize permissions
    Google->>Backend: GET /api/auth/google/callback?code=...
    Backend->>Google: Exchange code for tokens
    Google->>Backend: Return access_token & refresh_token
    Backend->>Firestore: Store tokens for user
    Backend->>Frontend: Return success
    Frontend->>User: Show "Connected" status
```

## Text Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Gemini
    participant ActionRouter
    participant GoogleAPI
    participant Firestore

    User->>Frontend: Enter text or use voice
    Frontend->>Backend: POST /api/process<br/>{text: "Schedule meeting tomorrow"}
    Backend->>Backend: Verify Firebase token
    Backend->>Gemini: analyzeText(text)
    Gemini->>Gemini: Process with AI prompt
    Gemini->>Backend: Return JSON<br/>{action: "calendar", title: "...", date: "..."}
    Backend->>ActionRouter: routeAction(userId, response)
    ActionRouter->>ActionRouter: Determine action type
    ActionRouter->>Firestore: Get user's OAuth tokens
    Firestore->>ActionRouter: Return tokens
    ActionRouter->>ActionRouter: Refresh if expired
    ActionRouter->>GoogleAPI: Create calendar event/task/email
    GoogleAPI->>ActionRouter: Return result
    ActionRouter->>Backend: Return ActionResult
    Backend->>Frontend: Return JSON response
    Frontend->>User: Display result
```

## Data Structures

### Gemini Response Structure

```typescript
{
  action: "calendar" | "task" | "email" | "unknown",
  title?: string,
  description?: string,
  date?: string,        // ISO date or relative ("tomorrow")
  time?: string,         // HH:MM format
  duration?: number,     // minutes (for calendar)
  location?: string,     // for calendar events
  recipient?: string,    // email address
  subject?: string,      // email subject
  body?: string,         // email body
  dueDate?: string,      // for tasks
  priority?: "low" | "medium" | "high"
}
```

### API Response Structure

```typescript
{
  success: boolean,
  action: string,
  message: string,
  data?: {
    id: string,
    title?: string,
    start?: string,
    end?: string,
    // ... other fields depending on action
  }
}
```




