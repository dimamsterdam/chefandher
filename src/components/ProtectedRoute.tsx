import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SessionResponse {
  data: { session: Session | null };
  error: Error | null;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser, setProfile, isLoading, setIsLoading } = useAuthStore();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    console.log('ProtectedRoute mounted, current state:', { user, isLoading, authChecked });

    const fetchUser = async () => {
      try {
        console.log('Starting fetchUser');
        setIsLoading(true);
        setAuthChecked(false);
        
        // First check localStorage for existing session
        const storedSessionStr = localStorage.getItem('sb-pphkyhrdfcceeuwgeqgu-auth-token');
        console.log('Stored session in localStorage:', storedSessionStr);

        if (!storedSessionStr) {
          console.log('No stored session found, redirecting to auth');
          setUser(null);
          setProfile(null);
          navigate('/auth');
          return;
        }

        try {
          const storedSession = JSON.parse(storedSessionStr);
          if (storedSession?.user) {
            console.log('Using stored session user:', storedSession.user);
            setUser(storedSession.user as User);
            
            // Try to fetch profile using Supabase Client again
            try {
              console.log('[DEBUG] Attempting profile fetch using Supabase client for user:', storedSession.user.id);
              
              console.log('[DEBUG] Attempting MANUAL profile fetch for user:', storedSession.user.id);
              const userId = storedSession.user.id;
              const accessToken = storedSession.access_token;
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Get URL from env
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // Get key from env

              if (!accessToken) {
                  console.error('[ERROR] No access token found in stored session for manual fetch.');
                  throw new Error('Missing access token');
              }
              if (!supabaseUrl || !supabaseAnonKey) {
                console.error('[ERROR] Missing Supabase URL or Anon Key for manual fetch.');
                throw new Error('Missing Supabase env vars');
              }

              const profileUrl = `${supabaseUrl}/rest/v1/profiles?select=*&id=eq.${userId}`;
              console.log('[DEBUG] Manual fetch URL:', profileUrl);

              const headers = {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json'
              };
              console.log('[DEBUG] Manual fetch headers (excluding token):', { apikey: headers.apikey, Accept: headers.Accept });

              console.log('[DEBUG] Initiating manual fetch...');
              const response = await fetch(profileUrl, { method: 'GET', headers });
              console.log('[DEBUG] Manual fetch response status:', response.status, response.statusText);

              if (!response.ok) {
                  console.error('[ERROR] Manual profile fetch failed:', response.status, response.statusText);
                  const errorBody = await response.text(); // Read error body as text
                  console.error('[ERROR] Manual profile fetch error body:', errorBody);
                  // Attempt profile creation if response indicates not found (e.g., empty array for select)
                  // Supabase REST API usually returns 200 OK with an empty array if RLS allows select but row doesn't exist.
                  // A 4xx/5xx error indicates a more fundamental issue (auth, RLS policy, server error)
                  setProfile(null);
              } else {
                  const profileData = await response.json();
                  console.log('[DEBUG] Manual profile fetch success, data:', profileData);
                  
                  if (Array.isArray(profileData) && profileData.length > 0) {
                      console.log('[DEBUG] Profile found via manual fetch:', profileData[0]);
                      setProfile(profileData[0]);
                  } else {
                       console.log('[WARN] Profile not found via manual fetch (empty array), attempting creation...');
                      // Now attempt creation if manual select returned empty
                      try {
                        // Use Supabase client for creation as it's simpler
                        console.log('[DEBUG] Attempting profile creation using Supabase client...')
                        const createResult = await supabase
                          .from('profiles')
                          .insert([
                            {
                              id: storedSession.user.id,
                              full_name: storedSession.user.email?.split('@')[0] || 'User',
                              avatar_url: null,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString()
                            }
                          ])
                          .select()
                          .single();
                        
                        console.log('[DEBUG] Profile creation result:', createResult);
                        
                        if (createResult.error) {
                          console.error('[ERROR] Error creating profile:', createResult.error);
                          setProfile(null);
                        } else {
                          console.log('[DEBUG] New profile created:', createResult.data);
                          setProfile(createResult.data);
                        }
                      } catch (createError) {
                         console.error('[ERROR] Exception during profile creation:', createError);
                         setProfile(null);
                      }
                  }
              }
            } catch (manualFetchError) {
              console.error('[ERROR] Exception during manual profile fetch logic:', manualFetchError);
              setProfile(null);
            } finally {
              console.log('[DEBUG] Setting loading states to false after manual attempt');
              setIsLoading(false);
              setAuthChecked(true);
            }
            return;
          }
        } catch (e) {
          console.error('Error parsing stored session:', e);
        }

        // If we get here, try to get a fresh session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Fresh session fetch result:', { session, error: sessionError });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setUser(null);
          setProfile(null);
          navigate('/auth');
          return;
        }
        
        if (session?.user) {
          console.log('User found in fresh session:', session.user);
          setUser(session.user);
          
          // Try to fetch profile
          try {
            console.log('Attempting to fetch profile for user:', session.user.id);
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profileError) {
              console.error('Profile fetch error details:', {
                message: profileError.message,
                code: profileError.code,
                details: profileError.details,
                hint: profileError.hint
              });
              
              // If profile doesn't exist, create it
              if (profileError.code === 'PGRST116') {
                console.log('Profile not found, creating new profile');
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert([
                    {
                      id: session.user.id,
                      full_name: session.user.email?.split('@')[0] || 'User',
                      avatar_url: null,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }
                  ])
                  .select()
                  .single();
                
                if (createError) {
                  console.error('Error creating profile:', createError);
                  setProfile(null);
                } else {
                  console.log('New profile created:', newProfile);
                  setProfile(newProfile);
                }
              } else {
                setProfile(null);
              }
            } else {
              console.log('Profile fetched successfully:', profile);
              setProfile(profile);
            }
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
            setProfile(null);
          }
        } else {
          console.log('No user in session, redirecting to auth');
          setUser(null);
          setProfile(null);
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in ProtectedRoute:', error);
        setUser(null);
        setProfile(null);
        navigate('/auth');
      } finally {
        console.log('Setting loading states to false');
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    fetchUser();

    // Set up real-time auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user);
        setUser(session.user);
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          console.log('Profile fetched after sign in:', profile);
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
      }
    });

    return () => {
      console.log('ProtectedRoute cleanup');
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setProfile, setIsLoading]);

  console.log('ProtectedRoute render:', { user, isLoading, authChecked });

  if (isLoading && !authChecked) {
    console.log('Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
