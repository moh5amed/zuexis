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
    console.log('🔧 AuthContext: Supabase configured:', configured);

    if (!configured) {
      console.log('⚠️ AuthContext: Supabase not configured, skipping auth setup');
      setLoading(false);
      return;
    }

    console.log('🚀 AuthContext: Starting authentication setup...');

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 AuthContext: Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 AuthContext: Session response:', { session, error });
        
        if (error) {
          console.error('❌ AuthContext: Error getting session:', error);
        } else {
          console.log('✅ AuthContext: Initial session result:', session ? 'Session found' : 'No session');
          if (session?.user) {
            console.log('👤 AuthContext: User found:', session.user.email);
            console.log('👤 AuthContext: User ID:', session.user.id);
          }
        }
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('❌ AuthContext: Error in getInitialSession:', error);
      } finally {
        setLoading(false);
        console.log('🏁 AuthContext: Initial session loading complete');
      }
    };

    getInitialSession();

    // Listen for auth changes
    console.log('👂 AuthContext: Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 AuthContext: Cleaning up auth listener');
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
      console.log('🔐 AuthContext: Starting signup process...');
      console.log('🔐 AuthContext: Email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0], // Use email prefix as full name
          }
        }
      });

      console.log('🔐 AuthContext: Supabase response:', { data, error });
      console.log('🔐 AuthContext: User data:', data?.user);
      console.log('🔐 AuthContext: Session data:', data?.session);

      if (error) {
        console.error('❌ AuthContext: Sign up error:', error);
        return { user: null, error };
      }

      if (data.user) {
        console.log('✅ AuthContext: Sign up successful:', data.user.email);
        console.log('✅ AuthContext: User ID:', data.user.id);
        console.log('✅ AuthContext: User metadata:', data.user.user_metadata);
        
        // Test if we can actually query the user
        console.log('🔍 AuthContext: Testing user query...');
        const { data: userData, error: userError } = await supabase.auth.getUser();
        console.log('🔍 AuthContext: Get user result:', { userData, userError });
        
        return { user: data.user, error: null };
      }

      return { user: null, error: { message: 'No user data returned', name: 'NoUserError', status: 500 } as AuthError };
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error in signUp:', error);
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
      console.log('Attempting to sign in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { user: null, error };
      }

      console.log('Sign in successful:', data.user?.email);
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Unexpected error in signIn:', error);
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
        console.log('Attempting to sign in with Google...');
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
          console.error('Google sign in error:', error);
          return { user: null, error };
        }

        // OAuth redirects to the provider, so we return success
        // The user will be redirected back and the auth state will update
        console.log('Google OAuth initiated successfully');
        return { user: null, error: null };
      } catch (error) {
        console.error('Unexpected error in signInWithGoogle:', error);
        return { user: null, error: error as AuthError };
      }
  };

  const signOut = async () => {
    if (!isConfigured) {
      console.error('Cannot sign out: Supabase not configured');
      return;
    }

    try {
      console.log('🚪 [AuthContext] Starting sign out process...');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ [AuthContext] Sign out error:', error);
        throw error;
      }
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      console.log('✅ [AuthContext] Sign out successful, local state cleared');
      
    } catch (error) {
      console.error('❌ [AuthContext] Unexpected error in signOut:', error);
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
      console.log('Attempting to reset password for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
      } else {
        console.log('Password reset email sent successfully');
      }

      return { error };
    } catch (error) {
      console.error('Unexpected error in resetPassword:', error);
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
