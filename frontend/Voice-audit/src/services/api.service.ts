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
 * Safely parse JSON response, handling HTML error pages
 */
async function parseJsonResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  
  // Check if response is actually JSON
  if (!contentType || !contentType.includes('application/json')) {
    // If it's HTML, it's likely an error page (404, 500, etc.)
    if (contentType && contentType.includes('text/html')) {
      const htmlText = await response.text();
      // Try to extract error message from HTML if possible
      const titleMatch = htmlText.match(/<title>(.*?)<\/title>/i);
      const errorTitle = titleMatch ? titleMatch[1] : 'Error';
      
      throw new Error(
        `Backend returned HTML instead of JSON (${response.status} ${response.statusText}). ` +
        `This usually means:\n` +
        `1. The API endpoint doesn't exist (404)\n` +
        `2. The backend URL is incorrect\n` +
        `3. The backend server is not running\n\n` +
        `Current API URL: ${response.url}\n` +
        `Please check your VITE_API_BASE_URL environment variable.`
      );
    }
    
    // Unknown content type
    throw new Error(
      `Unexpected content type: ${contentType || 'unknown'}. ` +
      `Expected JSON but received ${contentType || 'unknown content'}. ` +
      `Status: ${response.status} ${response.statusText}`
    );
  }
  
  // Parse JSON
  try {
    return await response.json();
  } catch (parseError) {
    // If JSON parsing fails, get the raw text for debugging
    const text = await response.text();
    throw new Error(
      `Failed to parse JSON response. ` +
      `Status: ${response.status} ${response.statusText}. ` +
      `Response preview: ${text.substring(0, 200)}...`
    );
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
    try {
      const errorData = await parseJsonResponse(response);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    } catch (error: any) {
      // If parsing failed, throw the original error
      if (error.message.includes('Backend returned HTML') || error.message.includes('Unexpected content type')) {
        throw error;
      }
      // Otherwise, it's a JSON error response
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
  }

  return await parseJsonResponse(response);
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
    try {
      const errorData = await parseJsonResponse(response);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    } catch (error: any) {
      // If parsing failed, throw the original error
      if (error.message.includes('Backend returned HTML') || error.message.includes('Unexpected content type')) {
        throw error;
      }
      // Otherwise, it's a JSON error response
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
  }

  const data = await parseJsonResponse(response);
  if (!data.authUrl) {
    throw new Error('Invalid response: authUrl not found in response');
  }
  return data.authUrl;
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH);
    if (!response.ok) {
      try {
        const errorData = await parseJsonResponse(response);
        throw new Error(errorData.message || 'Backend is not responding');
      } catch (parseError: any) {
        if (parseError.message.includes('Backend returned HTML') || parseError.message.includes('Unexpected content type')) {
          throw new Error(
            `Cannot connect to backend server.\n\n` +
            `The backend URL might be incorrect or the server is not running.\n` +
            `Current API URL: ${API_ENDPOINTS.HEALTH}\n` +
            `Please check your VITE_API_BASE_URL environment variable.`
          );
        }
        throw parseError;
      }
    }
    return await parseJsonResponse(response);
  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(
        `Cannot connect to backend server.\n\n` +
        `Possible issues:\n` +
        `1. Backend server is not running\n` +
        `2. Backend URL is incorrect: ${API_ENDPOINTS.HEALTH}\n` +
        `3. CORS is blocking the request\n\n` +
        `Please check your VITE_API_BASE_URL environment variable.`
      );
    }
    throw error;
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
    try {
      const errorData = await parseJsonResponse(response);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    } catch (error: any) {
      // If parsing failed, throw the original error
      if (error.message.includes('Backend returned HTML') || error.message.includes('Unexpected content type')) {
        throw error;
      }
      // Otherwise, it's a JSON error response
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
  }

  return await parseJsonResponse(response);
}

