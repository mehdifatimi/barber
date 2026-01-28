'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    DollarSign,
    BarChart3,
    Scissors,
    Loader2,
    ArrowUpRight,
    PieChart,
    Wallet
} from 'lucide-react';

export default function AdminStatsPage() {
    const [stats, setStats] = useState({
        totalGMV: 0,
        totalNetRevenue: 0,
        averageBookingValue: 0,
    });
    const [barberPerformance, setBarberPerformance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFinancials();
    }, []);

    async function fetchFinancials() {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select(`
                    id, 
                    total_price, 
                    status,
                    barbers:barber_id (profiles(full_name))
                `)
                .eq('status', 'completed');

            if (error) throw error;

            const gmv = bookings?.reduce((acc, b) => acc + (b.total_price || 0), 0) || 0;
            const net = gmv * 0.1; // 10% commission

            setStats({
                totalGMV: gmv,
                totalNetRevenue: net,
                averageBookingValue: bookings?.length ? gmv / bookings.length : 0,
            });

            // Calculate per barber performance
            const performanceMap: Record<string, any> = {};
            bookings?.forEach(booking => {
                const name = (booking.barbers as any)?.profiles?.full_name || 'Unknown';
                if (!performanceMap[name]) {
                    performanceMap[name] = { name, revenue: 0, count: 0 };
                }
                performanceMap[name].revenue += booking.total_price || 0;
                performanceMap[name].count += 1;
            });

            setBarberPerformance(Object.values(performanceMap).sort((a, b) => b.revenue - a.revenue));

        } catch (error) {
            console.error('Error fetching financials:', error);
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
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Commission & Revenue</h1>
                    <p className="text-muted-foreground mt-2">Track financial performance and platform take rate.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="border-border/50 shadow-2xl rounded-3xl bg-card/50 backdrop-blur-xl border-b-4 border-b-primary">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Gross Merchandise Value</CardTitle>
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">{stats.totalGMV.toLocaleString()} DH</div>
                            <p className="text-xs text-muted-foreground mt-2">Total value of all completed services</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-2xl rounded-3xl bg-primary/10 backdrop-blur-xl border-b-4 border-b-primary">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wider">Net Platform Revenue</CardTitle>
                            <Wallet className="w-5 h-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-primary">{stats.totalNetRevenue.toLocaleString()} DH</div>
                            <p className="text-xs text-primary/60 mt-2">10% commission on all bookings</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-2xl rounded-3xl bg-card/50 backdrop-blur-xl border-b-4 border-b-primary">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Average Ticket</CardTitle>
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">{stats.averageBookingValue.toFixed(2)} DH</div>
                            <p className="text-xs text-muted-foreground mt-2">Per confirmed appointment</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Performing Barbers */}
                    <Card className="border-border/50 shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 px-8 py-6">
                            <CardTitle className="flex items-center gap-2">
                                <Scissors className="w-5 h-5 text-primary" />
                                Top Performing Professionals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {barberPerformance.map((barber, index) => (
                                    <div key={barber.name} className="flex items-center justify-between p-6">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl font-black text-muted-foreground/30 w-6">#{index + 1}</span>
                                            <div>
                                                <p className="font-bold">{barber.name}</p>
                                                <p className="text-xs text-muted-foreground">{barber.count} bookings</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-primary">{barber.revenue.toLocaleString()} DH</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Revenue</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue Distribution (Visual Placeholder) */}
                    <Card className="border-border/50 shadow-2xl rounded-3xl bg-card/50 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-48 h-48 rounded-full border-[16px] border-primary/20 flex items-center justify-center relative">
                            <div className="w-48 h-48 rounded-full border-[16px] border-primary border-t-transparent animate-pulse absolute" />
                            <div className="text-center">
                                <p className="text-3xl font-black">10%</p>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Take Rate</p>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mt-8">Revenue Efficiency</h3>
                        <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                            Calculating platform margin based on current pricing strategy and service volume.
                        </p>
                        <Button className="mt-6 rounded-2xl px-8 h-12 font-bold bg-primary hover:bg-primary/90">
                            Download Report
                        </Button>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Missing component helper
function Button({ className, children, ...props }: any) {
    return <button className={`inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`} {...props}>{children}</button>
}
