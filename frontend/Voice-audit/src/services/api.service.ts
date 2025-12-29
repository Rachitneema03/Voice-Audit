import { API_ENDPOINTS } from '../config/api.config';
import { auth } from '../firebase/firebaseConfig';

export interface ProcessTextResponse {
  success: boolean;
  action?: string;
  message: string;
  data?: any;
  results?: ProcessTextResponse[]; // For multiple actions
  totalActions?: number;
  successfulActions?: number;
  failedActions?: number;
}

/**
 * Get Firebase ID token for authentication
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Process text command through backend
 */
export async function processText(text: string): Promise<ProcessTextResponse> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('User not authenticated. Please sign in.');
  }

  const response = await fetch(API_ENDPOINTS.PROCESS_TEXT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get Google OAuth authorization URL
 */
export async function getGoogleAuthUrl(): Promise<string> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('User not authenticated. Please sign in.');
  }

  const response = await fetch(API_ENDPOINTS.GOOGLE_AUTH_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.authUrl;
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH);
    if (!response.ok) {
      throw new Error('Backend is not responding');
    }
    return await response.json();
  } catch (error) {
    throw new Error('Cannot connect to backend server. Make sure it is running on port 5000.');
  }
}

/**
 * Check if user has connected Google account
 */
export async function checkGoogleConnection(): Promise<{ success: boolean; connected: boolean; message: string }> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('User not authenticated. Please sign in.');
  }

  const response = await fetch(API_ENDPOINTS.GOOGLE_STATUS, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

