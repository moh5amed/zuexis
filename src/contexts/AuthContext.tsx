import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if Supabase is properly configured
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);
    if (!configured) {
      setLoading(false);
      return;
    }
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
        } else {
          if (session?.user) {
          }
        }
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!isConfigured) {
      return { 
        user: null, 
        error: { 
          message: 'Supabase is not configured. Please check your environment variables.',
          name: 'ConfigurationError',
          status: 500
        } as AuthError 
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0], // Use email prefix as full name
          }
        }
      });
      if (error) {
        return { user: null, error };
      }

      if (data.user) {
        // Test if we can actually query the user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        return { user: data.user, error: null };
      }

      return { user: null, error: { message: 'No user data returned', name: 'NoUserError', status: 500 } as AuthError };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return { 
        user: null, 
        error: { 
          message: 'Supabase is not configured. Please check your environment variables.',
          name: 'ConfigurationError',
          status: 500
        } as AuthError 
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error };
      }
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  };

  const signInWithGoogle = async (): Promise<{ user: User | null; error: AuthError | null }> => {
    if (!isConfigured) {
      return { 
        user: null, 
        error: { 
          message: 'Supabase is not configured. Please check your environment variables.',
            name: 'ConfigurationError',
            status: 500
          } as AuthError 
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          },
        });

        if (error) {
          return { user: null, error };
        }

        // OAuth redirects to the provider, so we return success
        // The user will be redirected back and the auth state will update
        return { user: null, error: null };
      } catch (error) {
        return { user: null, error: error as AuthError };
      }
  };

  const signOut = async () => {
    if (!isConfigured) {
      return;
    }

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
    } catch (error) {
      // Even if there's an error, clear local state
      setUser(null);
      setSession(null);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return { 
        error: { 
          message: 'Supabase is not configured. Please check your environment variables.',
          name: 'ConfigurationError',
          status: 500
        } as AuthError 
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
      } else {
      }

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
