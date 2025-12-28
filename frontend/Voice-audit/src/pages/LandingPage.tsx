import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-logo-title-container">
          <img src="/logo3.png" alt="Voice Audit Logo" className="landing-logo" />
          <h1 className="landing-title">Voice Audit</h1>
        </div>
        <p className="landing-subtitle">Transform your commands into actions with AI-powered voice recognition</p>
        <button className="get-started-btn" onClick={handleGetStarted}>
          Get Started
        </button>
      </div>

      <div className="landing-content">
        <div className="glass-card">
          <div className="card-icon">
            <i className="bi bi-mic-fill"></i>
          </div>
          <h2>Voice Commands</h2>
          <p>Record your voice commands and let our AI understand your intent. Speak naturally and watch as your commands are executed seamlessly.</p>
        </div>

        <div className="glass-card">
          <div className="card-icon">
            <i className="bi bi-robot"></i>
          </div>
          <h2>AI-Powered</h2>
          <p>Advanced artificial intelligence processes your voice commands, understands context, and executes solutions accordingly.</p>
        </div>

        <div className="glass-card">
          <div className="card-icon">
            <i className="bi bi-lightning-fill"></i>
          </div>
          <h2>Fast & Efficient</h2>
          <p>Get instant responses and quick execution of your commands. Our system is optimized for speed and accuracy.</p>
        </div>

        <div className="glass-card">
          <div className="card-icon">
            <i className="bi bi-shield-lock-fill"></i>
          </div>
          <h2>Secure & Private</h2>
          <p>Your voice data is encrypted and processed securely. We prioritize your privacy and data protection.</p>
        </div>

        <div className="glass-card">
          <div className="card-icon">
            <i className="bi bi-phone-fill"></i>
          </div>
          <h2>Cross-Platform</h2>
          <p>Access your voice audit from any device. Works seamlessly across desktop, tablet, and mobile devices.</p>
        </div>

        <div className="glass-card">
          <div className="card-icon">
            <i className="bi bi-lightbulb-fill"></i>
          </div>
          <h2>Smart Solutions</h2>
          <p>Our AI understands complex commands and provides intelligent solutions tailored to your specific needs.</p>
        </div>
      </div>

      <div className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>About Voice Audit</h3>
            <p>Voice Audit is a cutting-edge voice assistant platform that transforms spoken commands into actionable solutions. Our AI-powered system understands natural language, processes voice commands with precision, and executes solutions seamlessly across various platforms.</p>
          </div>
          <div className="footer-section">
            <h3>Features</h3>
            <ul>
              <li>AI-Powered Voice Recognition</li>
              <li>Real-time Command Processing</li>
              <li>Secure & Encrypted</li>
              <li>Cross-Platform Support</li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Contact</h3>
            <p>Experience the future of voice interaction today. Start your journey with Voice Audit and transform how you interact with technology.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="copyright">© {new Date().getFullYear()} Voice Audit. All rights reserved.</p>
          <p className="team">Created with ❤️ by <span className="team-name">HopScotch</span></p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

