import React, { useState, useRef, useEffect } from 'react';
import './UserDropdown.css';

interface UserData {
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  status?: 'online' | 'offline' | 'busy';
}

interface UserDropdownProps {
  user: UserData;
  isGoogleConnected?: boolean;
  onEditProfile: () => void;
  onSettings?: () => void;
  onConnectGoogle: () => void;
  onLogout: () => void;
  collapsed?: boolean;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  isGoogleConnected = false,
  onEditProfile,
  onSettings,
  onConnectGoogle,
  onLogout,
  collapsed = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    switch (action) {
      case 'edit-profile':
        onEditProfile();
        break;
      case 'settings':
        onSettings?.();
        break;
      case 'connect-google':
        onConnectGoogle();
        break;
      case 'logout':
        onLogout();
        break;
    }
    setIsOpen(false);
  };

  return (
    <div className={`user-dropdown-container ${collapsed ? 'collapsed' : ''}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        className="user-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="user-dropdown-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="user-dropdown-avatar-img" />
          ) : (
            <span className="user-dropdown-avatar-text">{user.initials}</span>
          )}
          <span 
            className="user-dropdown-status-dot" 
            style={{ backgroundColor: '#22c55e' }}
          />
        </div>
        {!collapsed && (
          <>
            <div className="user-dropdown-info">
              <span className="user-dropdown-name">{user.name}</span>
              <span className="user-dropdown-email">{user.email}</span>
            </div>
            <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} user-dropdown-chevron`} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="user-dropdown-menu">
          {/* Header */}
          <div className="user-dropdown-header">
            <div className="user-dropdown-header-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user.initials}</span>
              )}
            </div>
            <div className="user-dropdown-header-info">
              <span className="user-dropdown-header-name">{user.name}</span>
              <span className="user-dropdown-header-email">{user.email}</span>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Profile Section */}
          <div className="user-dropdown-section">
            <button className="user-dropdown-item" onClick={() => handleAction('edit-profile')}>
              <span className="user-dropdown-item-content">
                <i className="bi bi-person-circle" />
                <span>Edit Profile</span>
              </span>
            </button>
            <button className="user-dropdown-item" onClick={() => handleAction('settings')}>
              <span className="user-dropdown-item-content">
                <i className="bi bi-gear" />
                <span>Settings</span>
              </span>
            </button>
            <button className="user-dropdown-item" onClick={() => handleAction('connect-google')}>
              <span className="user-dropdown-item-content">
                {isGoogleConnected ? (
                  <>
                    <i className="bi bi-check-circle-fill" style={{ color: '#22c55e' }} />
                    <span>Google Connected</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-google" />
                    <span>Connect Google</span>
                  </>
                )}
              </span>
              {isGoogleConnected && (
                <span className="user-dropdown-badge success">Connected</span>
              )}
            </button>
          </div>

          <div className="user-dropdown-divider" />

          {/* Help Section */}
          <div className="user-dropdown-section">
            <button className="user-dropdown-item">
              <span className="user-dropdown-item-content">
                <i className="bi bi-bell" />
                <span>Notifications</span>
              </span>
            </button>
            <button className="user-dropdown-item">
              <span className="user-dropdown-item-content">
                <i className="bi bi-question-circle" />
                <span>Help & Support</span>
              </span>
              <i className="bi bi-box-arrow-up-right" style={{ fontSize: '12px', opacity: 0.5 }} />
            </button>
          </div>

          <div className="user-dropdown-divider" />

          {/* Logout Section */}
          <div className="user-dropdown-section">
            <button className="user-dropdown-item danger" onClick={() => handleAction('logout')}>
              <span className="user-dropdown-item-content">
                <i className="bi bi-box-arrow-right" />
                <span>Sign Out</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
