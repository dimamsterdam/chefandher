import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  isLoading: boolean;
  error: string | null;
  authChecked: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: { full_name: string | null; avatar_url: string | null } | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthChecked: (checked: boolean) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: false,
  error: null,
  authChecked: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setAuthChecked: (authChecked) => set({ authChecked }),
  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, profile: null });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  refreshSession: async () => {
    try {
      set({ isLoading: true, error: null, authChecked: false });
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.user) {
        set({ user: session.user });
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', session.user.id)
          .single();
        set({ profile });
      } else {
        set({ user: null, profile: null });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false, authChecked: true });
    }
  },
}));
