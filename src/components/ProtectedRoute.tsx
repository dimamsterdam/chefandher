import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

interface SessionResponse {
  data: { session: Session | null };
  error: Error | null;
}

// Helper function to add delay for retry operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser, setProfile, isLoading, setIsLoading } = useAuthStore();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authAttempts, setAuthAttempts] = useState(0);
  const MAX_AUTH_ATTEMPTS = 3;

  // Memoized function to fetch profile data with retry logic
  const fetchProfileWithRetry = useCallback(async (userId: string, accessToken: string, attempt = 0): Promise<any> => {
    try {
      console.log(`Attempting profile fetch (attempt ${attempt + 1})`);
      
      // Try using Supabase client first
      try {
        console.log('Attempting profile fetch using Supabase client');
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!error && data) {
          console.log('Profile fetched successfully via client:', data);
          return data;
        }
        
        console.log('Client fetch unsuccessful, falling back to manual fetch');
      } catch (clientError) {
        console.error('Error with client fetch:', clientError);
      }
      
      // Manual fetch as backup
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing required auth parameters');
      }
      
      const profileUrl = `${supabaseUrl}/rest/v1/profiles?select=*&id=eq.${userId}`;
      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };
      
      console.log('Initiating manual fetch...');
      const response = await fetch(profileUrl, { method: 'GET', headers });
      
      if (!response.ok) {
        console.error('Manual profile fetch failed:', response.status, response.statusText);
        const errorBody = await response.text();
        console.error('Error body:', errorBody);
        throw new Error(`Profile fetch failed: ${response.status}`);
      }
      
      const profileData = await response.json();
      console.log('Manual profile fetch success:', profileData);
      
      if (Array.isArray(profileData) && profileData.length > 0) {
        console.log('Profile found:', profileData[0]);
        return profileData[0];
      } else {
        console.log('Profile not found, attempting creation...');
        
        // Create new profile
        try {
          const profileData: ProfileInsert = {
            id: userId,
            full_name: 'User',
            avatar_url: null
          };
          
          const createResult = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();
          
          if (createResult.error) {
            throw createResult.error;
          }
          
          console.log('New profile created:', createResult.data);
          return createResult.data;
        } catch (createError: any) {
          console.error('Error creating profile:', createError);
          throw new Error(`Failed to create profile: ${createError.message}`);
        }
      }
    } catch (error) {
      console.error('Profile fetch/create error:', error);
      
      // Implement retry with exponential backoff
      if (attempt < 2) {
        const backoffTime = Math.min(Math.pow(2, attempt + 1) * 500, 5000);
        console.log(`Retrying after ${backoffTime}ms...`);
        await delay(backoffTime);
        return fetchProfileWithRetry(userId, accessToken, attempt + 1);
      }
      
      throw error;
    }
  }, []);

  // Main authentication check with improved error handling and retries
  const checkAuthentication = useCallback(async (attempt = 0) => {
    try {
      setIsLoading(true);
      setAuthChecked(false);
      
      console.log(`Starting authentication check (attempt ${attempt + 1}/${MAX_AUTH_ATTEMPTS})`);
      
      // Check localStorage for existing session
      const storedSessionStr = localStorage.getItem('sb-pphkyhrdfcceeuwgeqgu-auth-token');
      console.log('Stored session available:', !!storedSessionStr);
      
      if (storedSessionStr) {
        try {
          const storedSession = JSON.parse(storedSessionStr);
          if (storedSession?.user) {
            console.log('Found user in stored session');
            setUser(storedSession.user as User);
            
            try {
              const profile = await fetchProfileWithRetry(
                storedSession.user.id,
                storedSession.access_token
              );
              
              setProfile(profile);
              setIsLoading(false);
              setAuthChecked(true);
              return;
            } catch (profileError) {
              console.error('Failed to get profile from stored session:', profileError);
              // Continue to fresh session check as fallback
            }
          }
        } catch (parseError) {
          console.error('Error parsing stored session:', parseError);
        }
      }
      
      // Get a fresh session
      console.log('Fetching fresh session');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (session?.user) {
        console.log('User found in fresh session');
        setUser(session.user);
        
        try {
          const profile = await fetchProfileWithRetry(
            session.user.id,
            session.access_token
          );
          
          setProfile(profile);
        } catch (profileError) {
          console.error('Failed to get profile from fresh session:', profileError);
          setProfile(null);
        }
        
        setIsLoading(false);
        setAuthChecked(true);
      } else {
        console.log('No user in session, redirecting to auth');
        setUser(null);
        setProfile(null);
        navigate('/auth');
        setIsLoading(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      
      // Implement retry with exponential backoff
      if (attempt < MAX_AUTH_ATTEMPTS - 1) {
        const backoffTime = Math.min(Math.pow(2, attempt + 1) * 500, 5000);
        console.log(`Authentication check failed, retrying after ${backoffTime}ms...`);
        
        await delay(backoffTime);
        return checkAuthentication(attempt + 1);
      } else {
        console.error('Authentication check failed after max retries');
        toast.error("Authentication error. Please try logging in again.");
        setUser(null);
        setProfile(null);
        navigate('/auth');
        setIsLoading(false);
        setAuthChecked(true);
      }
    }
  }, [navigate, setUser, setProfile, setIsLoading, fetchProfileWithRetry]);

  useEffect(() => {
    console.log('ProtectedRoute mounted, current state:', { user, isLoading, authChecked });
    
    if (!authChecked) {
      checkAuthentication();
    }
    
    // Set up real-time auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user);
        setUser(session.user);
        try {
          const profile = await fetchProfileWithRetry(
            session.user.id,
            session.access_token
          );
          
          setProfile(profile);
        } catch (error) {
          console.error('Error fetching profile after sign in:', error);
          setProfile(null);
        }
        setAuthChecked(true);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setProfile(null);
        navigate('/auth');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
        // Re-fetch user profile on token refresh to ensure we have fresh data
        if (session?.user) {
          try {
            const profile = await fetchProfileWithRetry(
              session.user.id,
              session.access_token
            );
            
            setProfile(profile);
          } catch (error) {
            console.error('Error refreshing profile after token refresh:', error);
          }
        }
      }
    });

    return () => {
      console.log('ProtectedRoute cleanup');
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setProfile, setIsLoading, authChecked, checkAuthentication, fetchProfileWithRetry, user, isLoading]);

  // Add UI elements for retry
  if (isLoading && !authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4" />
        <div className="text-sm text-gray-500">
          Connecting to server...
        </div>
        {authAttempts > 0 && (
          <button
            onClick={() => {
              setAuthAttempts(prev => prev + 1);
              checkAuthentication();
            }}
            className="mt-4 text-primary underline text-sm"
          >
            Retry connection
          </button>
        )}
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
