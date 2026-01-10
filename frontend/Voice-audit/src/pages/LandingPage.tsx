import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import BlurText from '../components/BlurText';
import ProfileCard from '../components/ProfileCard';
import Particles from '../components/Particles';
import PixelCard from '../components/PixelCard';
import ScrollProgress from '../components/ScrollProgress';
import ScrollLinePath from '../components/ScrollLinePath';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  isReady?: boolean;
}

const LandingPage = ({ isReady = false }: LandingPageProps) => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('home');
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Refs for GSAP animations
  const heroRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subHeadingRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const footerRef = useRef<HTMLElement>(null);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const scrollToSection = (sectionId: string) => {
    setActiveNav(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Navbar scroll behavior - always active
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP animations - wait for isReady
  useEffect(() => {
    if (!isReady) return;

    // Hero animations
    const heroTl = gsap.timeline();
    
    heroTl
      .fromTo(
        headingRef.current,
        { opacity: 0, y: 100, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power4.out' }
      )
      .fromTo(
        subHeadingRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
        '-=0.6'
      )
      .fromTo(
        ctaRef.current,
        { opacity: 0, y: 30, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' },
        '-=0.4'
      );

    // About section cards animation
    cardsRef.current.forEach((card, index) => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 80, rotateX: 15 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            end: 'top 50%',
            toggleActions: 'play none none reverse',
          },
          delay: index * 0.15,
        }
      );
    });

    // Footer animation
    gsap.fromTo(
      footerRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footerRef.current,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [isReady]);

  const addToCardsRef = (el: HTMLDivElement | null) => {
    if (el && !cardsRef.current.includes(el)) {
      cardsRef.current.push(el);
    }
  };

  const services = [
    {
      icon: 'bi-envelope-fill',
      title: 'Voice Email',
      description: 'Compose and send emails effortlessly using just your voice. Dictate your message, specify recipients, and send — all hands-free with AI-powered natural language understanding.',
      variant: 'blue' as const,
    },
    {
      icon: 'bi-calendar-event-fill',
      title: 'Google Calendar',
      description: 'Schedule meetings and events on Google Calendar with simple voice commands. Just say when and what, and your calendar gets updated instantly.',
      variant: 'purple' as const,
    },
    {
      icon: 'bi-check2-square',
      title: 'Google Tasks',
      description: 'Create and manage tasks on Google Tasks by voice. Set due dates, times, and priorities — all through natural conversation with our AI assistant.',
      variant: 'green' as const,
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      period: '',
      features: ['100 voice commands/month', 'Basic AI processing', 'Email support', 'Web access'],
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$19',
      period: '/month',
      features: ['Unlimited commands', 'Advanced AI features', 'Priority support', 'API access', 'Analytics dashboard'],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: ['Custom solutions', 'Dedicated support', 'SLA guarantee', 'On-premise option', 'Custom integrations'],
      highlighted: false,
    },
  ];

  return (
    <div className="landing-page">
      {/* Particles Background */}
      <div className="particles-wrapper">
        <Particles
          particleColors={['#88d4d4', '#6bc5c5', '#4db8b8']}
          particleCount={80}
          particleSpread={8}
          speed={0.05}
          particleBaseSize={60}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={true}
        />
      </div>

      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Scroll Line Path Graphic */}
      <ScrollLinePath />

      {/* Navigation */}
      <nav ref={navRef} className={`nav-glass ${isNavVisible ? 'nav-visible' : 'nav-hidden'}`}>
        <div className="nav-container">
          <div className="nav-logo" onClick={() => scrollToSection('home')}>
            Voice Audit
          </div>
          <div className="nav-links">
            <button
              className={`nav-link ${activeNav === 'services' ? 'active' : ''}`}
              onClick={() => scrollToSection('services')}
            >
              <span className="nav-link-text">Services</span>
              <span className="nav-link-indicator"></span>
            </button>
            <button
              className={`nav-link ${activeNav === 'pricing' ? 'active' : ''}`}
              onClick={() => scrollToSection('pricing')}
            >
              <span className="nav-link-text">Pricing</span>
              <span className="nav-link-indicator"></span>
            </button>
            <button
              className={`nav-link ${activeNav === 'team' ? 'active' : ''}`}
              onClick={() => scrollToSection('team')}
            >
              <span className="nav-link-text">Team</span>
              <span className="nav-link-indicator"></span>
            </button>
            <button className="nav-signin" onClick={handleGetStarted}>
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div ref={heroRef} className="hero-content">
          <h1 ref={headingRef} className="hero-heading" style={{ opacity: isReady ? undefined : 0 }}>
            <BlurText
              text="Transform Voice"
              delay={300}
              animateBy="words"
              direction="top"
              className="hero-heading-line"
            />
            <br />
            <BlurText
              text="Into Action"
              delay={300}
              animateBy="words"
              direction="top"
              className="hero-heading-accent"
            />
          </h1>
          <p ref={subHeadingRef} className="hero-subheading" style={{ opacity: isReady ? undefined : 0 }}>
            Experience the future of voice technology. Seamlessly convert your spoken commands into powerful actions with our AI-driven platform.
          </p>
          <button ref={ctaRef} className="hero-cta" onClick={handleGetStarted} style={{ opacity: isReady ? undefined : 0 }}>
            Get Started
            <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div className="hero-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" ref={aboutRef} className="about-section">
        <div className="section-header">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">Premium Services</h2>
          <p className="section-description">
            Discover our comprehensive suite of voice-powered solutions designed for modern workflows.
          </p>
        </div>
        <div className="cards-grid pixel-cards-grid">
          {services.map((service, index) => (
            <PixelCard key={index} variant={service.variant} gap={6} speed={40}>
              <div className="pixel-service-content">
                <div className="pixel-service-icon">
                  <i className={`bi ${service.icon}`}></i>
                </div>
                <h3 className="pixel-service-title">{service.title}</h3>
                <p className="pixel-service-description">{service.description}</p>
              </div>
            </PixelCard>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <span className="section-label">Pricing</span>
          <h2 className="section-title">Choose Your Plan</h2>
          <p className="section-description">
            Flexible pricing options to match your needs and scale with your growth.
          </p>
        </div>
        <div className="pricing-grid">
          {pricingPlans.map((plan, index) => (
            <div key={index} ref={addToCardsRef} className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
              {plan.highlighted && <span className="popular-badge">Most Popular</span>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="price">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex}>
                    <i className="bi bi-check2"></i>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className={`plan-cta ${plan.highlighted ? 'primary' : ''}`} onClick={handleGetStarted}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="team-section">
        <div className="section-header">
          <span className="section-label">Our Team</span>
          <h2 className="section-title">Meet The Creators</h2>
          <p className="section-description">
            The talented individuals behind Voice Audit who make the magic happen.
          </p>
        </div>
        <div className="team-grid">
          <ProfileCard
            name="Rachit Neema"
            role="Developer"
            imageUrl="/team/rachit-neema.jpg"
            linkedInUrl="https://www.linkedin.com/in/rachit-neema/"
            showUserInfo
            behindGlowColor="hsla(217, 100%, 70%, 0.6)"
            customInnerGradient="linear-gradient(145deg, hsla(217, 40%, 45%, 0.55) 0%, hsla(58, 60%, 70%, 0.27) 100%)"
          />
          <ProfileCard
            name="Nitika Jain"
            role="Developer"
            imageUrl="/team/nitika-jain.jpg"
            linkedInUrl="https://www.linkedin.com/in/nitika-jain-b8690b353/"
            showUserInfo
            behindGlowColor="hsla(280, 100%, 70%, 0.6)"
            customInnerGradient="linear-gradient(145deg, hsla(280, 40%, 45%, 0.55) 0%, hsla(320, 60%, 70%, 0.27) 100%)"
          />
          <ProfileCard
            name="Yash Vyas"
            role="Developer"
            imageUrl="/team/yash-vyas.jpg"
            linkedInUrl="https://www.linkedin.com/in/yash-vyas-a44540317/"
            showUserInfo
            behindGlowColor="hsla(160, 100%, 50%, 0.6)"
            customInnerGradient="linear-gradient(145deg, hsla(160, 40%, 40%, 0.55) 0%, hsla(180, 60%, 60%, 0.27) 100%)"
          />
          <ProfileCard
            name="Sumedha Mandloi"
            role="Developer"
            imageUrl="/team/sumedha-mandloi.jpg"
            linkedInUrl="https://www.linkedin.com/in/sumedha-mandloi/"
            showUserInfo
            behindGlowColor="hsla(340, 100%, 65%, 0.6)"
            customInnerGradient="linear-gradient(145deg, hsla(340, 40%, 45%, 0.55) 0%, hsla(20, 60%, 65%, 0.27) 100%)"
          />
        </div>
      </section>

      {/* Footer */}
      <footer ref={footerRef} className="footer-glass">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <h3 className="footer-logo">Voice Audit</h3>
              <p className="footer-tagline">
                Transforming voice into action. Built with precision, designed for the future.
              </p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-column">
                <h4>Product</h4>
                <ul>
                  <li><a href="#services">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#team">Team</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Resources</h4>
                <ul>
                  <li><a href="#">Documentation</a></li>
                  <li><a href="#">API Reference</a></li>
                  <li><a href="#">Support</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <ul>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-legal">
              <p>© {new Date().getFullYear()} Voice Audit. All rights reserved.</p>
            </div>
            <div className="footer-team">
              <span>Crafted by</span>
              <span className="team-name">HopScotch</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

