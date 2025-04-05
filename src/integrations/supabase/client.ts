
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { toast } from 'sonner';

const SUPABASE_URL = "https://pphkyhrdfcceeuwgeqgu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaGt5aHJkZmNjZWV1d2dlcWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3NTA2NTUsImV4cCI6MjA1NDMyNjY1NX0.RGfDegWptQst27i3RRcFQTagjmvA3vm9XCo8jG9Wn6o";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Create and configure supabase client with better error handling and retry logic
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'menu-planner'
    },
    // Add fetch options with timeout to prevent hanging requests
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const { signal } = controller;
      
      // Set timeout to 15 seconds to abort hanging requests
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('Supabase request timed out');
      }, 15000);
      
      return fetch(url, { ...options, signal })
        .then(response => {
          clearTimeout(timeoutId);
          return response;
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error('Supabase fetch error:', error);
          // Specifically handle abort errors
          if (error.name === 'AbortError') {
            toast.error('The request timed out. Please check your connection and try again.');
          } else if (error.name === 'TypeError' && error.message === 'Load failed') {
            toast.error('Failed to connect to the server. Please check your network connection.');
          } else {
            toast.error(`Request failed: ${error.message || 'Unknown error'}`);
          }
          throw error;
        });
    }
  },
  // Log DB query and authentication errors to the console
  db: {
    schema: 'public'
  }
});

// Modify the function invoke method to handle timeouts and errors more gracefully
const originalInvoke = supabase.functions.invoke;
supabase.functions.invoke = async function (functionName, options = {}) {
  try {
    console.log(`Calling edge function: ${functionName}`);
    
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set a timeout for edge function calls
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`Edge function call to ${functionName} timed out after 30 seconds`);
    }, 30000);

    // Create a new options object with the signal
    const updatedOptions = {
      ...options,
      signal: signal
    };
    
    // Try the original invoke with timeout
    const response = await Promise.race([
      originalInvoke.call(this, functionName, updatedOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Edge function ${functionName} call timed out`)), 30000)
      )
    ]);
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    console.error(`Error invoking edge function ${functionName}:`, error);
    
    // Show appropriate error message based on error type
    if (error.name === 'AbortError' || error.message?.includes('timed out')) {
      toast.error(`The request to ${functionName} timed out. Please try again later.`);
    } else if (error.name === 'TypeError' && error.message === 'Load failed') {
      toast.error('Failed to connect to the server. Please check your network connection.');
    } else {
      toast.error(`Error calling ${functionName}: ${error.message || 'Unknown error'}`);
    }
    
    throw error;
  }
};

// Add event listeners for connection issues
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Application is back online');
    toast.success('You are back online');
  });
  
  window.addEventListener('offline', () => {
    console.log('Application is offline');
    toast.error('You are offline. Some features will be unavailable.');
  });

  // Check for session expiration and token refresh failures
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Auth token refreshed successfully');
    } else if (event === 'USER_UPDATED') {
      console.log('User session updated');
    }
  });

  // Add additional error handling for Edge Function calls - REMOVING DUPLICATE IMPLEMENTATION
  // We already have one implementation above, so this second one is removed to avoid conflicts
  // This was causing the TypeScript error with fetchOptions
}
