
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser, setProfile, isLoading, setIsLoading } = useAuthStore();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get the current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth session error:', error);
          toast.error('Authentication error. Please sign in again.');
          navigate('/auth');
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          
          try {
            // Fetch user profile with retry logic
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              // Don't fail completely if profile fetch fails
            }
            
            setProfile(profile);
          } catch (profileError) {
            console.error('Profile fetch error:', profileError);
            // Continue even if profile fetch fails
          }
        } else {
          setUser(null);
          setProfile(null);
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error:', error);
        
        // Implement retry logic for network errors
        if (retryCount < MAX_RETRIES && error.name === 'TypeError') {
          setRetryCount(prev => prev + 1);
          setTimeout(fetchUser, 1000 * (retryCount + 1)); // Exponential backoff
          toast.error('Network error. Retrying authentication...');
        } else {
          navigate('/auth');
        }
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log("Auth check timeout - forcing completion");
        setIsLoading(false);
        setAuthChecked(true);
        if (!user) {
          toast.error('Authentication check timed out. Please refresh and try again.');
          navigate('/auth');
        }
      }
    }, 5000); // 5 seconds timeout

    fetchUser();

    // Set up real-time auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', session.user.id)
            .single();
          setProfile(profile);
        } catch (err) {
          console.error('Error fetching profile during auth change:', err);
        }
        setAuthChecked(true);
      } else if (event === 'SIGNED_OUT') {
        // Removed 'USER_DELETED' as it's not a valid event type in the current Supabase version
        setUser(null);
        setProfile(null);
        navigate('/auth');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user || null);
      }
    });

    // Cleanup subscription and timeout on unmount
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate, setUser, setProfile, setIsLoading, user, retryCount]);

  if (isLoading && !authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4" />
        <p className="text-sm text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
