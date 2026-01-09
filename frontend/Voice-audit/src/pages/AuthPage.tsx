import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { saveUserProfile } from '../services/firestore.service';
import TrueFocus from '../components/TrueFocus';
import './AuthPage.css';

const AuthPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate('/chat');
    }
  }, [currentUser, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isSignIn) {
        userCredential = await signInWithEmail(email, password);
      } else {
        userCredential = await signUpWithEmail(email, password);
      }
      
      // Save user profile to Firestore
      if (userCredential?.user) {
        await saveUserProfile(userCredential.user, isSignIn ? undefined : name);
      }
      
      // Redirect to chat after successful authentication
      navigate('/chat');
    } catch (err: any) {
      // Handle Firebase auth errors
      let errorMessage = 'An error occurred. Please try again.';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithGoogle();
      
      // Save user profile to Firestore
      if (userCredential?.user) {
        await saveUserProfile(userCredential.user);
      }
      
      // Redirect to chat after successful authentication
      navigate('/chat');
    } catch (err: any) {
      let errorMessage = 'Google authentication failed. Please try again.';
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignIn(!isSignIn);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="auth-page">
      {/* Brand Name - Outside Container */}
      <div className="auth-brand">
        <TrueFocus
          sentence="Voice Audit"
          manualMode={false}
          blurAmount={4.5}
          borderColor="#1a1a1a"
          glowColor="rgba(26, 26, 26, 0.4)"
          animationDuration={0.5}
          pauseBetweenAnimations={1}
        />
      </div>

      <div className="auth-container">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">{isSignIn ? 'Sign In' : 'Sign Up'}</h1>
          <p className="auth-subtitle">
            {isSignIn ? 'Access your voice command dashboard' : 'Create your account to get started'}
          </p>
        </div>

        {/* Google Auth Button */}
        <button 
          className="google-auth-btn" 
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Processing...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="auth-divider">
          <span>Or continue with email</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="auth-error">
            <i className="bi bi-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isSignIn && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <div className="input-wrapper">
                <i className="bi bi-person"></i>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isSignIn}
                  placeholder="Enter your name"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <i className="bi bi-envelope"></i>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="hello@example.com"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <i className="bi bi-lock"></i>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : isSignIn ? 'Sign In' : 'Sign Up'}
            {!loading && <i className="bi bi-arrow-right"></i>}
          </button>
        </form>

        {/* Toggle Auth Mode */}
        <div className="auth-toggle">
          {isSignIn ? "Don't have an account? " : "Already have an account? "}
          <button className="toggle-btn" onClick={toggleAuthMode} disabled={loading}>
            {isSignIn ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

