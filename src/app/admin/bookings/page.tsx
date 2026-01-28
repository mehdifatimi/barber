'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Calendar as CalendarIcon,
    Clock,
    Scissors,
    User,
    Loader2,
    Search,
    Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchBookings();
    }, []);

    async function fetchBookings() {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    barbers:barber_id (profiles(full_name)),
                    clients:client_id (full_name, avatar_url),
                    services:service_id (name)
                `)
                .order('start_time', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredBookings = bookings.filter(b =>
        b.barbers?.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.services?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Confirmed</Badge>;
            case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
            case 'cancelled': return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Cancelled</Badge>;
            case 'completed': return <Badge className="bg-primary/10 text-primary border-primary/20">Completed</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <DashboardLayout role="admin">
            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Global Bookings</h1>
                    <p className="text-muted-foreground mt-2">Monitor all platform activities and appointment statuses.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by barber, client or service..."
                            className="pl-12 h-12 rounded-2xl border-border/50 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-card/50 backdrop-blur-sm rounded-3xl border border-border/50 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Barber</th>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                    {booking.clients?.avatar_url ? (
                                                        <img src={booking.clients.avatar_url} className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        booking.clients?.full_name?.charAt(0)
                                                    )}
                                                </div>
                                                <span className="font-bold text-sm">{booking.clients?.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium">{booking.barbers?.profiles?.full_name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase">
                                                {booking.services?.name}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs space-y-1">
                                                <p className="font-bold flex items-center gap-1"><CalendarIcon className="w-3 h-3 text-primary" /> {format(new Date(booking.start_time), 'MMM dd, yyyy')}</p>
                                                <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" /> {format(new Date(booking.start_time), 'p')}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(booking.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-primary">{booking.total_price} DH</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {filteredBookings.length === 0 && (
                    <div className="py-20 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-border flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No bookings found matching your search.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
