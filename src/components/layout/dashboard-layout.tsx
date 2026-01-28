'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { LogOut, LayoutDashboard, Calendar, Settings, Scissors, BarChart, Bell, Search, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationsDropdown from '@/components/notifications/notifications-dropdown';

export default function DashboardLayout({
    children,
    role
}: {
    children: React.ReactNode;
    role: 'admin' | 'barber' | 'client';
}) {
    const { user, signOut, loading } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null }>({
        full_name: '',
        avatar_url: null
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            fetchProfile();
        }
    }, [user, loading]);

    async function fetchProfile() {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user?.id)
                .single();

            if (data) {
                setProfile({
                    full_name: data.full_name || 'User',
                    avatar_url: data.avatar_url
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }

    const menuItems = {
        admin: [
            { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
            { label: 'Barbers', icon: Scissors, href: '/admin/barbers' },
            { label: 'Stats', icon: BarChart, href: '/admin/stats' },
            { label: 'Categories', icon: Settings, href: '/admin/categories' },
            { label: 'All Bookings', icon: Calendar, href: '/admin/bookings' },
        ],
        barber: [
            { label: 'Dashboard', icon: LayoutDashboard, href: '/barber' },
            { label: 'My Calendar', icon: Calendar, href: '/barber/calendar' },
            { label: 'My Bookings', icon: Calendar, href: '/barber/bookings' },
            { label: 'Services', icon: Scissors, href: '/barber/services' },
            { label: 'My Reviews', icon: BarChart, href: '/barber/reviews' },
            { label: 'Profile', icon: Settings, href: '/barber/profile' },
        ],
        client: [
            { label: 'Dashboard', icon: LayoutDashboard, href: '/client/dashboard' },
            { label: 'My Bookings', icon: Calendar, href: '/client/dashboard/bookings' },
            { label: 'Favorites', icon: LayoutDashboard, href: '/client/dashboard/favorites' },
        ]
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-primary">BarberApp</h2>
                </div>
                <nav className="mt-6 space-y-2 px-4">
                    {menuItems[role].map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent group transition-all"
                        >
                            <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                            <span className="font-medium group-hover:text-foreground">{item.label}</span>
                        </Link>
                    ))}

                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive group mt-10 transition-all font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top Navigation */}
                <header className="h-20 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50 px-8 flex items-center justify-between">
                    <div className="relative max-w-md w-full hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Quick search..."
                            className="w-full pl-10 h-10 text-sm bg-muted/30 border-none rounded-xl focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationsDropdown />
                        <div className="h-6 w-px bg-border mx-2" />
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black leading-none">{profile.full_name || 'Loading...'}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{role}</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 overflow-hidden">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-5 h-5" />
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8 bg-background/50">
                    <div className="max-w-6xl mx-auto pb-10">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
