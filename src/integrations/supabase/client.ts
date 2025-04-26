
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client');

// Track connection health
let lastSuccessfulOperation = Date.now();
let connectionHealthy = true;

// Custom storage implementation with better error handling
const storage = {
  getItem: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      console.log(`Retrieved storage item: ${key.substring(0, 5)}... (value exists: ${!!value})`);
      return value;
    } catch (error) {
      console.error('Error retrieving data from storage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      console.log(`Stored item: ${key.substring(0, 5)}...`);
    } catch (error) {
      console.error('Error saving data to storage:', error);
      // If it's likely a storage quota issue, try clearing some space
      try {
        // Clear potentially stale data (non-essential)
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && !storageKey.includes('supabase')) {
            localStorage.removeItem(storageKey);
          }
        }
        // Try again
        localStorage.setItem(key, value);
      } catch (retryError) {
        console.error('Failed to store data even after cleanup:', retryError);
      }
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      console.log(`Removed storage item: ${key.substring(0, 5)}...`);
    } catch (error) {
      console.error('Error removing data from storage:', error);
    }
  },
};

// Create Supabase client with enhanced configuration
const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'chefandher',
    },
  },
});

// Set up custom fetch interceptor to monitor connection health
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const isSupabaseFetch = typeof input === 'string' && input.includes(supabaseUrl);
  
  if (isSupabaseFetch) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('Request timeout for URL:', input);
    }, 10000);
    
    const customInit = { ...init };
    if (!customInit.signal) {
      customInit.signal = controller.signal;
    }
    
    try {
      const response = await originalFetch(input, customInit);
      clearTimeout(timeoutId);
      
      // Update connection health tracking on successful responses
      if (response.ok) {
        lastSuccessfulOperation = Date.now();
        connectionHealthy = true;
      }
      
      return response;
    } catch (error) {
      // Track connection health issues
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'TypeError' || error.message.includes('network')) {
          connectionHealthy = false;
        }
      }
      throw error;
    }
  }
  
  return originalFetch(input, init);
};

// Check initial session state and set up token refresh monitoring
supabaseClient.auth.getSession().then(({ data: { session }, error }) => {
  console.log('Initial session check:', { sessionExists: !!session, error: !!error });
  
  if (session) {
    // Set up token refresh monitoring
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiryDate = new Date(expiresAt * 1000);
      const refreshTime = new Date(expiryDate.getTime() - 60000); // 1 minute before expiry
      const now = new Date();
      
      if (refreshTime <= now) {
        // Token is about to expire or has expired, refresh immediately
        console.log('Token needs immediate refresh');
        supabaseClient.auth.refreshSession();
      } else {
        // Schedule a refresh for later
        const timeToRefresh = refreshTime.getTime() - now.getTime();
        console.log(`Token refresh scheduled in ${Math.round(timeToRefresh / 1000)} seconds`);
        setTimeout(() => {
          console.log('Executing scheduled token refresh');
          supabaseClient.auth.refreshSession();
        }, timeToRefresh);
      }
    }
  }
});

// Helper functions to check client health
export const isSupabaseConnectionHealthy = () => {
  const timeSinceLastSuccess = Date.now() - lastSuccessfulOperation;
  return connectionHealthy && timeSinceLastSuccess < 60000; // Less than a minute
};

// Export the supabase client
export const supabase = supabaseClient;
