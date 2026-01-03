/**
 * Utility functions to test API connectivity from the frontend
 */

// Get the API base URL from environment variables
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

/**
 * Test the connection to the backend API
 * @returns {Promise<Object>} The response from the API
 */
export const testApiConnection = async () => {
  try {
    console.log(`Testing API connection to ${API_URL}/api/test/health...`);
    const response = await fetch(`${API_URL}/api/test/health`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status, response.statusText);
    console.log('Response headers:', [...response.headers.entries()]);
    
    if (!response.ok) {
      throw new Error(`Failed to connect to API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API connection test result:', data);
    return {
      success: true,
      data,
      statusCode: response.status
    };
  } catch (error) {
    console.error('API connection test failed. Full error:', error);
    
    // Check for network errors
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('This appears to be a network error - CORS or connectivity issue');
      
      // Try a simple HEAD request to check if server is reachable
      try {
        console.log('Attempting HEAD request to check server availability...');
        const headCheck = await fetch(API_URL, { method: 'HEAD' });
        console.log('HEAD request result:', headCheck.status);
      } catch (headError) {
        console.error('HEAD request also failed:', headError);
      }
    }
    
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
};

/**
 * Test the database connection
 * @returns {Promise<Object>} The response from the API
 */
export const testDatabaseConnection = async () => {
  try {
    console.log(`Testing database connection via ${API_URL}/api/test/db-status...`);
    const response = await fetch(`${API_URL}/api/test/db-status`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check database status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Database connection test result:', data);
    return {
      success: true,
      data,
      isConnected: data.database?.connected || false,
      statusCode: response.status
    };
  } catch (error) {
    console.error('Database connection test failed. Full error:', error);
    return {
      success: false,
      error: error.message,
      details: error,
      isConnected: false
    };
  }
};

/**
 * Get available API routes
 * @returns {Promise<Object>} The response from the API
 */
export const getApiRoutes = async () => {
  try {
    console.log(`Getting API routes from ${API_URL}/api/test/routes...`);
    const response = await fetch(`${API_URL}/api/test/routes`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get API routes: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API routes:', data);
    return {
      success: true,
      data,
      routes: data.routes || [],
      statusCode: response.status
    };
  } catch (error) {
    console.error('Failed to get API routes. Full error:', error);
    return {
      success: false,
      error: error.message,
      details: error,
      routes: []
    };
  }
}; 