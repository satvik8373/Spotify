/**
 * HuggingFace API Client for Emotion Detection
 * 
 * This module provides a configured axios client for interacting with the
 * HuggingFace emotion classification API.
 * 
 * Requirements: 2.1, 2.5
 */

import axios from 'axios';

// Updated to new HuggingFace router endpoint (api-inference.huggingface.co is deprecated as of 2025)
const HUGGINGFACE_API_URL = 'https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base';
const TIMEOUT_MS = 5000; // 5 seconds

/**
 * Creates and configures an axios instance for HuggingFace API calls
 * 
 * @returns {axios.AxiosInstance} Configured axios client
 * 
 * Requirements: 2.1, 2.5, 13.1, 13.5
 */
function createHuggingFaceClient() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    // Log warning internally but don't expose to users (Requirement 13.5)
    console.warn('[HuggingFace] HUGGINGFACE_API_KEY not found in environment variables');
  }

  const client = axios.create({
    baseURL: HUGGINGFACE_API_URL,
    timeout: TIMEOUT_MS,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor for logging (Requirement 13.1)
  client.interceptors.request.use(
    (config) => {
      // Log request details internally without exposing API key
      console.log('[HuggingFace] Request:', {
        url: config.url || config.baseURL,
        method: config.method,
        timeout: config.timeout,
        hasApiKey: !!config.headers.Authorization,
        timestamp: new Date().toISOString()
      });
      return config;
    },
    (error) => {
      // Log error details internally (Requirement 13.1)
      console.error('[HuggingFace] Request error:', {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      });
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging (Requirement 13.1)
  client.interceptors.response.use(
    (response) => {
      // Log successful response details
      console.log('[HuggingFace] Response:', {
        status: response.status,
        dataLength: JSON.stringify(response.data).length,
        timestamp: new Date().toISOString()
      });
      return response;
    },
    (error) => {
      // Log error details internally without exposing sensitive info (Requirement 13.1, 13.5)
      console.error('[HuggingFace] Response error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        timestamp: new Date().toISOString()
      });
      
      // Don't include response data in logs as it might contain sensitive info
      return Promise.reject(error);
    }
  );

  return client;
}

// Export singleton instance
const huggingfaceClient = createHuggingFaceClient();

export default huggingfaceClient;
