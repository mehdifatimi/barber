'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Users,
    Scissors,
    Calendar,
    TrendingUp,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeBarbers: 0,
        pendingBarbers: 0,
        totalBookings: 0,
        totalRevenue: 0,
        growthRate: 12.5 // Placeholder
    });
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminStats();
    }, []);

    async function fetchAdminStats() {
        try {
            const [usersRes, barbersRes, bookingsRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact' }),
                supabase.from('barbers').select('verification_status'),
                supabase.from('bookings').select('total_price, status'),
            ]);

            const activeB = barbersRes.data?.filter(b => b.verification_status === 'approved').length || 0;
            const pendingB = barbersRes.data?.filter(b => b.verification_status === 'pending').length || 0;
            const revenue = bookingsRes.data
                ?.filter(b => b.status === 'completed')
                .reduce((acc, b) => acc + (b.total_price || 0), 0) || 0;

            setStats({
                totalUsers: usersRes.count || 0,
                activeBarbers: activeB,
                pendingBarbers: pendingB,
                totalBookings: bookingsRes.data?.length || 0,
                totalRevenue: revenue,
                growthRate: 15.2
            });

            // Fetch pending barber requests
            const { data: pendingBarbers } = await supabase
                .from('barbers')
                .select('*, profiles(full_name, avatar_url, email)')
                .eq('verification_status', 'pending')
                .limit(5);

            setRecentRequests(pendingBarbers || []);

        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <DashboardLayout role="admin">
            <div className="space-y-10">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                            Platform Overview
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">Real-time monitoring of your barber marketplace.</p>
                    </div>
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Global Commission (10%)</span>
                        <span className="text-2xl font-black text-primary">{(stats.totalRevenue * 0.1).toFixed(2)} DH</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-border/50 shadow-2xl hover:scale-[1.03] transition-all duration-300 rounded-3xl bg-card/50 backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Users</CardTitle>
                            <Users className="w-5 h-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <div className="text-4xl font-black">{stats.totalUsers}</div>
                                <span className="text-green-500 text-xs font-bold flex items-center">
                                    <ArrowUpRight className="w-3 h-3" /> {stats.growthRate}%
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Active clients and barbers</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-2xl hover:scale-[1.03] transition-all duration-300 rounded-3xl bg-card/50 backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Barbers</CardTitle>
                            <Scissors className="w-5 h-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">{stats.activeBarbers}</div>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-none font-bold">
                                    {stats.pendingBarbers} pending
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-2xl hover:scale-[1.03] transition-all duration-300 rounded-3xl bg-card/50 backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Bookings</CardTitle>
                            <Calendar className="w-5 h-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">{stats.totalBookings}</div>
                            <p className="text-xs text-muted-foreground mt-2">Successful appointments</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-2xl hover:scale-[1.03] transition-all duration-300 rounded-3xl bg-card/50 backdrop-blur-xl ring-2 ring-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Gross Volume</CardTitle>
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-primary">{stats.totalRevenue.toLocaleString()} <span className="text-lg">DH</span></div>
                            <p className="text-xs text-muted-foreground mt-2">Across all vendors</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Validation Requests */}
                    <Card className="lg:col-span-2 border-border/50 shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 px-8 py-6">
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    Validation Requests
                                </CardTitle>
                                <Badge className="bg-primary/10 text-primary border-none">{recentRequests.length} New</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentRequests.length > 0 ? (
                                <div className="divide-y divide-border/50">
                                    {recentRequests.map((barber) => (
                                        <div key={barber.id} className="flex items-center justify-between p-6 hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-bold">
                                                    {barber.profiles?.full_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg">{barber.profiles?.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">{barber.profiles?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                                                    asChild
                                                >
                                                    <a href={`/admin/barbers/${barber.id}`}>View Profile</a>
                                                </Button>
                                                <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90">Approve</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center gap-2">
                                    <CheckCircle2 className="w-12 h-12 text-muted-foreground/20" />
                                    <p className="text-muted-foreground font-medium">Clear! No pending requests.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Activity Feed (Static/Placeholder) */}
                    <Card className="border-border/50 shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 px-8 py-6">
                            <CardTitle className="text-lg">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="relative">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                                            {i !== 4 && <div className="absolute top-4 left-1 w-px h-10 bg-border" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">New booking confirmed</p>
                                            <p className="text-xs text-muted-foreground">2 minutes ago</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
