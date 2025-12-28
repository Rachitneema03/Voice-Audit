// Backend API configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  PROCESS_TEXT: `${API_BASE_URL}/api/process`,
  GOOGLE_AUTH_URL: `${API_BASE_URL}/api/auth/google/url`,
  GOOGLE_AUTH_CALLBACK: `${API_BASE_URL}/api/auth/google/callback`,
  GOOGLE_STATUS: `${API_BASE_URL}/api/user/google-status`,
};

