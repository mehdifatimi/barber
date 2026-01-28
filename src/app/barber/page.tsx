'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, Calendar, Scissors, Star } from 'lucide-react';
import { format, subDays, startOfDay, isWithinInterval } from 'date-fns';
import { RevenueTrendChart, TopServicesChart, BusyHoursChart } from '@/components/barber/analytics-charts';

export default function BarberDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todayBookings: 0,
        totalRevenue: 0,
        avgRating: 0,
        totalServices: 0
    });
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [analyticsData, setAnalyticsData] = useState<{
        revenue: any[];
        services: any[];
        hours: any[];
    }>({ revenue: [], services: [], hours: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        } else {
            setLoading(false);
        }
    }, [user]);

    async function fetchDashboardData() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [bookingsRes, servicesRes, reviewsRes] = await Promise.all([
                supabase
                    .from('bookings')
                    .select('*, profiles:client_id(full_name), services:service_id(name, price)')
                    .eq('barber_id', user?.id)
                    .order('start_time', { ascending: false }),
                supabase.from('services').select('id', { count: 'exact' }).eq('barber_id', user?.id),
                supabase.from('reviews').select('rating').eq('barber_id', user?.id),
            ]);

            if (bookingsRes.data) {
                const todayCount = bookingsRes.data.filter(b => new Date(b.start_time) >= today).length;
                const totalRev = bookingsRes.data
                    .filter(b => b.status === 'completed')
                    .reduce((acc, b) => acc + (b.total_price || 0), 0);

                setStats(prev => ({
                    ...prev,
                    todayBookings: todayCount,
                    totalRevenue: totalRev,
                    totalServices: servicesRes.count || 0
                }));
                setRecentBookings(bookingsRes.data.slice(0, 5));

                // Process Analytics Data
                const last30Days = Array.from({ length: 30 }, (_, i) => {
                    const date = subDays(new Date(), i);
                    return format(date, 'yyyy-MM-dd');
                }).reverse();

                // 1. Revenue Trend
                const revenueMap = bookingsRes.data
                    .filter(b => b.status === 'completed')
                    .reduce((acc: any, b) => {
                        const date = format(new Date(b.start_time), 'yyyy-MM-dd');
                        acc[date] = (acc[date] || 0) + (b.total_price || 0);
                        return acc;
                    }, {});

                const revenueTrend = last30Days.map(date => ({
                    date,
                    amount: revenueMap[date] || 0
                }));

                // 2. Service Distribution
                const serviceMap = bookingsRes.data.reduce((acc: any, b) => {
                    const name = b.services?.name || 'Unknown';
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                }, {});

                const serviceDistribution = Object.entries(serviceMap).map(([name, value]) => ({
                    name,
                    value: value as number
                })).sort((a, b) => b.value - a.value);

                // 3. Busy Hours
                const hourMap = bookingsRes.data.reduce((acc: any, b) => {
                    const hour = format(new Date(b.start_time), 'HH:00');
                    acc[hour] = (acc[hour] || 0) + 1;
                    return acc;
                }, {});

                const busyHours = Object.entries(hourMap).map(([hour, count]) => ({
                    hour,
                    count: count as number
                })).sort((a, b) => a.hour.localeCompare(b.hour));

                setAnalyticsData({
                    revenue: revenueTrend,
                    services: serviceDistribution,
                    hours: busyHours
                });
            }

            if (reviewsRes.data && reviewsRes.data.length > 0) {
                const avg = reviewsRes.data.reduce((acc, r) => acc + r.rating, 0) / reviewsRes.data.length;
                setStats(prev => ({ ...prev, avgRating: parseFloat(avg.toFixed(1)) }));
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
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
        <DashboardLayout role="barber">
            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Barber Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">Welcome back! Here's what's happening today.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-border/50 shadow-xl hover:scale-[1.02] transition-transform">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
                            <Calendar className="w-4 h-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.todayBookings}</div>
                            <p className="text-xs text-muted-foreground mt-1">+2 from yesterday</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-xl hover:scale-[1.02] transition-transform">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <TrendingUp className="w-4 h-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalRevenue} DH</div>
                            <p className="text-xs text-muted-foreground mt-1">Life time earnings</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-xl hover:scale-[1.02] transition-transform">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
                            <Scissors className="w-4 h-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalServices}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-xl hover:scale-[1.02] transition-transform">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.avgRating || 'N/A'}</div>
                            <p className="text-xs text-muted-foreground mt-1">Based on recent reviews</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <RevenueTrendChart data={analyticsData.revenue} />
                    <TopServicesChart data={analyticsData.services} />
                    <BusyHoursChart data={analyticsData.hours} />

                    <Card className="border-border/50 shadow-xl overflow-hidden lg:col-span-2">
                        <CardHeader className="bg-muted/30">
                            <CardTitle>Recent Appointments</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {recentBookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center justify-between p-6 hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {booking.profiles?.full_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{booking.profiles?.full_name}</p>
                                                <p className="text-sm text-muted-foreground">{booking.services?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{format(new Date(booking.start_time), 'p')}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(booking.start_time), 'MMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                ))}
                                {recentBookings.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No appointments found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
