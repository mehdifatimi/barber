'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, Calendar, Scissors, Star } from 'lucide-react';
import { format, subDays, startOfDay, isWithinInterval } from 'date-fns';
import { Download, FileDown, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
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
    const [exporting, setExporting] = useState(false);

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

    async function exportToCSV() {
        setExporting(true);
        try {
            // Fetch ALL completed bookings for the report
            const { data: allBookings, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    start_time,
                    status,
                    total_price,
                    profiles:client_id(full_name),
                    services:service_id(name)
                `)
                .eq('barber_id', user?.id)
                .eq('status', 'completed')
                .order('start_time', { ascending: false });

            if (error) throw error;
            if (!allBookings || allBookings.length === 0) {
                toast.error('No completed bookings to export');
                return;
            }

            // Create CSV header
            const headers = ['Date', 'Client', 'Service', 'Amount (DH)', 'Status'];
            const rows = allBookings.map((b: any) => [
                format(new Date(b.start_time), 'yyyy-MM-dd HH:mm'),
                (Array.isArray(b.profiles) ? b.profiles[0]?.full_name : b.profiles?.full_name) || 'Anonymous',
                (Array.isArray(b.services) ? b.services[0]?.name : b.services?.name) || 'Unknown',
                b.total_price || 0,
                b.status
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `revenue_report_${format(new Date(), 'yyyy_MM_dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Report exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export report');
        } finally {
            setExporting(false);
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Barber Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">Welcome back! Here's what's happening today.</p>
                    </div>

                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="rounded-2xl gap-2 h-12 px-6 shadow-xl shadow-primary/10 transition-all hover:scale-105">
                                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Export Accounts
                                    <ChevronDown className="w-4 h-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/50 shadow-2xl p-2">
                                <DropdownMenuItem
                                    onClick={exportToCSV}
                                    className="rounded-xl flex items-center gap-3 p-3 focus:bg-primary/10 focus:text-primary cursor-pointer"
                                >
                                    <FileDown className="w-4 h-4" />
                                    <div className="flex flex-col">
                                        <span className="font-bold">Export CSV</span>
                                        <span className="text-[10px] opacity-60">Best for Excel</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => window.print()}
                                    className="rounded-xl flex items-center gap-3 p-3 focus:bg-primary/10 focus:text-primary cursor-pointer"
                                >
                                    <FileText className="w-4 h-4" />
                                    <div className="flex flex-col">
                                        <span className="font-bold">Print Summary</span>
                                        <span className="text-[10px] opacity-60">PDF / Print View</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
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
                                                {((Array.isArray(booking.profiles) ? booking.profiles[0]?.full_name : booking.profiles?.full_name) || 'U').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold">
                                                    {(Array.isArray(booking.profiles) ? booking.profiles[0]?.full_name : booking.profiles?.full_name) || 'Verified Client'}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {(Array.isArray(booking.services) ? booking.services[0]?.name : booking.services?.name) || 'Haircut'}
                                                </p>
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

                {/* --- PRINTABLE STATEMENT (Hidden on screen) --- */}
                <div className="hidden print:block p-10 bg-white text-black min-h-screen">
                    <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Business Statement</h2>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Generated on {format(new Date(), 'PPP')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold">{user?.user_metadata?.full_name}</p>
                            <p className="text-sm text-gray-500">Professional Barber Portfolio</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8 mb-12">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                            <p className="text-2xl font-black">{stats.totalRevenue} DH</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Appointments</p>
                            <p className="text-2xl font-black">{recentBookings.length}+</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Rating</p>
                            <p className="text-2xl font-black">{stats.avgRating} / 5.0</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold border-b pb-2">Recent Completed Transactions</h3>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-gray-400 uppercase border-b bg-gray-50">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Client</th>
                                    <th className="py-3 px-4">Service</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {recentBookings.filter(b => b.status === 'completed').map((booking) => (
                                    <tr key={booking.id}>
                                        <td className="py-3 px-4">{format(new Date(booking.start_time), 'MMM d, yyyy')}</td>
                                        <td className="py-3 px-4 font-bold">
                                            {(Array.isArray(booking.profiles) ? booking.profiles[0]?.full_name : booking.profiles?.full_name) || 'Verified Client'}
                                        </td>
                                        <td className="py-3 px-4">
                                            {(Array.isArray(booking.services) ? booking.services[0]?.name : booking.services?.name) || 'Haircut'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black">{booking.total_price} DH</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-20 pt-8 border-t text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Thank you for using our Barber Management Platform
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
