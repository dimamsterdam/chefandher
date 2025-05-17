import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { 
    user, 
    setUser, 
    setProfile, 
    isLoading, 
    setIsLoading, 
    authChecked,
    setAuthChecked 
  } = useAuthStore();
  
  // Local state to prevent race conditions with Zustand
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          // User is authenticated
          if (isMounted) {
            setUser(session.user);
            
            // Fetch profile data
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profile) {
              setProfile(profile);
            } else {
              // Create profile if it doesn't exist
              const { data: newProfile } = await supabase
                .from('profiles')
                .insert([{
                  id: session.user.id,
                  full_name: session.user.email?.split('@')[0] || 'User',
                  avatar_url: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }])
                .select()
                .single();
                
              if (newProfile) setProfile(newProfile);
            }
          }
        } else if (isMounted) {
          // No session found
          setUser(null);
          setProfile(null);
          navigate('/auth');
        }
      } catch (err) {
        console.error('Auth error:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          navigate('/auth');
        }
      } finally {
        // Always update these flags regardless of outcome
        if (isMounted) {
          setIsLoading(false);
          setAuthChecked(true);
          setLocalLoading(false);
        }
      }
    };

    // Set up auth state listener first
    authSubscription = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session) {
        checkAuth(); // Recheck auth on sign in
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setAuthChecked(true);
        setIsLoading(false);
        navigate('/auth');
      }
    });

    // Initial auth check
    checkAuth();

    // Cleanup
    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
      // Reset states to avoid stuck loading state
      setIsLoading(false);
      setAuthChecked(true);
    };
  }, [navigate, setUser, setProfile, setIsLoading, setAuthChecked]);

  // Use both local and global loading state to prevent flickers
  if (localLoading || (isLoading && !authChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
