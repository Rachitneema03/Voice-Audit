# 🎤 Voice Audit

A modern voice assistant web application built with React, TypeScript, and Firebase. Users can record voice commands and interact with an AI-powered assistant that understands and executes solutions accordingly.

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-12.7.0-FFCA28?logo=firebase)

## ✨ Features

### 🏠 Landing Page
- **Scrollable Design**: Beautiful scrollable landing page with engaging content
- **Glass Morphism Effects**: Modern glassmorphism cards with backdrop blur
- **Smooth Animations**: Fade-in and transition effects on page load
- **Interactive Hover Effects**: Enhanced interactivity with hover states
- **Dark Theme**: Consistent dark theme (#0a0a0a) with white text
- **Call-to-Action**: "Get Started" button redirects to authentication

### 🔐 Authentication System
- **Email/Password Authentication**: Secure sign up and sign in functionality
- **Google Authentication**: One-click sign in with Google account
- **Firebase Integration**: Fully integrated with Firebase Authentication
- **Error Handling**: User-friendly error messages for all authentication scenarios
- **Loading States**: Visual feedback during authentication processes
- **Auto-redirect**: Authenticated users are automatically redirected to chat
- **Protected Routes**: Chat page requires authentication

### 💬 Chat Interface
- **Voice Recording**: Record voice commands using browser's MediaRecorder API
- **Real-time Chat**: Chat-type interface with message history
- **Message Timestamps**: Display timestamps for all messages
- **Chat History**: Side navbar with previous conversation history
- **Account Management**: 
  - User profile display (email and name)
  - Account menu with profile, settings, and sign out options
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Frontend Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 7.11.0
- **Authentication**: Firebase 12.7.0
- **Styling**: CSS3 with Glass Morphism effects

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Firebase Account** - [Sign up](https://firebase.google.com/)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Voice-audit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Google Analytics (optional)

#### Step 2: Register Your Web App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Register your app with a nickname
3. Copy your Firebase configuration

#### Step 3: Configure Firebase in the Project

1. Open `src/firebase/config.ts`
2. Replace the `firebaseConfig` object with your Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

#### Step 4: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Enable **Google** authentication:
   - Click on Google
   - Enable it
   - Add your project support email
   - Save

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port Vite assigns).

### 5. Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

### 6. Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
Voice-audit/
├── public/                 # Static assets
├── src/
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx    # Authentication context
│   ├── firebase/          # Firebase configuration
│   │   ├── config.ts          # Firebase app configuration
│   │   └── auth.ts            # Authentication service
│   ├── pages/             # Page components
│   │   ├── LandingPage.tsx    # Landing page
│   │   ├── LandingPage.css
│   │   ├── AuthPage.tsx       # Authentication page
│   │   ├── AuthPage.css
│   │   ├── ChatPage.tsx       # Chat interface
│   │   └── ChatPage.css
│   ├── App.tsx            # Main app component with routing
│   ├── App.css            # App-level styles
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Design Principles

- **Dark Theme**: Consistent dark background (#0a0a0a) with white text throughout
- **Glass Morphism**: Modern glassmorphism effects using backdrop-filter blur
- **No Gradients**: Solid colors only, no gradient backgrounds
- **Smooth Transitions**: All interactive elements have smooth transition effects
- **Hover Effects**: Enhanced interactivity with hover states on buttons and cards
- **Minimalist Design**: Clean, simple, and user-friendly interface

## 🌐 Browser Compatibility

- **Chrome** (latest) ✅
- **Firefox** (latest) ✅
- **Edge** (latest) ✅
- **Safari** (latest) ✅

**Note**: Voice recording requires:
- Modern browser with MediaRecorder API support
- Microphone permissions granted by the user

## 🔒 Security Features

- **Firebase Authentication**: Secure authentication with Firebase
- **Protected Routes**: Chat page requires authentication
- **Password Validation**: Minimum 6 characters required
- **Error Handling**: Comprehensive error handling for all auth scenarios

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## 🐛 Troubleshooting

### Firebase Authentication Not Working

1. Verify your Firebase configuration in `src/firebase/config.ts`
2. Ensure authentication methods are enabled in Firebase Console
3. Check browser console for error messages

### Voice Recording Not Working

1. Grant microphone permissions in your browser
2. Ensure you're using HTTPS (required for MediaRecorder API in production)
3. Check browser compatibility

### Build Errors

1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist`
3. Check TypeScript errors: `npm run build`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- [React](https://react.dev/) - UI library
- [Vite](https://vite.dev/) - Build tool
- [Firebase](https://firebase.google.com/) - Authentication and backend services
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact the maintainers

---

**Made with ❤️ using React, TypeScript, and Firebase**
