'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Role = 'admin' | 'barber' | 'client' | null;

interface AuthContextType {
    user: User | null;
    role: Role;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createBrowserClient();
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const handleAuth = async (session: any) => {
            console.log('[Auth] Handling auth state change:', !!session?.user);
            try {
                if (session?.user) {
                    setUser(session.user);

                    console.log('[Auth] Fetching role for user:', session.user.id);
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();

                    if (error) {
                        console.error('[Auth] Profile fetch error:', error);
                        // Fallback to metadata
                        setRole(session.user.user_metadata?.role || 'client');
                    } else if (profile?.role) {
                        console.log('[Auth] Role found in DB:', profile.role);
                        setRole(profile.role as Role);
                    } else {
                        console.log('[Auth] No profile found, falling back to metadata');
                        setRole(session.user.user_metadata?.role || 'client');
                    }
                } else {
                    console.log('[Auth] No user session found');
                    setUser(null);
                    setRole(null);
                }
            } catch (error) {
                console.error('[Auth] Unhandled error during auth check:', error);
            } finally {
                if (isMounted) {
                    console.log('[Auth] Setting loading to false');
                    setLoading(false);
                }
            }
        };

        // Initialize session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted) handleAuth(session);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (isMounted) handleAuth(session);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const signOut = async () => {
        await supabase.auth.signOut();
        // Force a hard refresh to clear all client-side state
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
