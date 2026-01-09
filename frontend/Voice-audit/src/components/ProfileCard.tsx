import { useRef, useState } from 'react';
import './ProfileCard.css';

interface ProfileCardProps {
  name: string;
  role: string;
  imageUrl?: string;
  linkedInUrl: string;
  behindGlowColor?: string;
  customInnerGradient?: string;
  showUserInfo?: boolean;
  enableMobileTilt?: boolean;
}

const ProfileCard = ({
  name,
  role,
  imageUrl,
  linkedInUrl,
  behindGlowColor = 'hsla(217, 100%, 70%, 0.6)',
  customInnerGradient = 'linear-gradient(145deg, hsla(217, 40%, 45%, 0.55) 0%, hsla(58, 60%, 70%, 0.27) 100%)',
  showUserInfo = true,
}: ProfileCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const handleClick = () => {
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div
      ref={cardRef}
      className="profile-card"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        '--glow-color': behindGlowColor,
        '--inner-gradient': customInnerGradient,
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      } as React.CSSProperties}
    >
      {/* Glow effect behind the card */}
      <div className={`profile-card-glow ${isHovered ? 'active' : ''}`} />
      
      {/* Card content */}
      <div className="profile-card-inner">
        {/* Flare effect */}
        <div className={`profile-card-flare ${isHovered ? 'active' : ''}`} />
        
        {/* Avatar */}
        <div className="profile-card-avatar">
          {imageUrl ? (
            <img src={imageUrl} alt={name} />
          ) : (
            <div className="profile-card-initials">{getInitials(name)}</div>
          )}
        </div>
        
        {/* User info */}
        {showUserInfo && (
          <div className="profile-card-info">
            <h3 className="profile-card-name">{name}</h3>
            <p className="profile-card-role">{role}</p>
          </div>
        )}
        
        {/* LinkedIn icon */}
        <div className="profile-card-linkedin">
          <i className="bi bi-linkedin"></i>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
