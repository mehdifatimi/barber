'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock, User, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';

function BookingsList() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);
    const [blockedClientIds, setBlockedClientIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user) {
            fetchBookings();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Handle highlighting and scrolling
    useEffect(() => {
        const bookingId = searchParams.get('bookingId');
        if (bookingId && !loading && bookings.length > 0) {
            setHighlightedBookingId(bookingId);

            // Wait for DOM to render
            setTimeout(() => {
                const element = document.getElementById(`booking-${bookingId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);

            // Remove highlight after 5 seconds
            const timer = setTimeout(() => {
                setHighlightedBookingId(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, loading, bookings]);

    async function fetchBookings() {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    profiles:client_id (full_name, avatar_url),
                    services:service_id (name, price, duration_minutes)
                `)
                .eq('barber_id', user?.id)
                .order('start_time', { ascending: false });

            if (error) throw error;
            setBookings(data || []);

            // Fetch blocked clients to sync UI
            const { data: blockedData } = await supabase
                .from('blocked_clients')
                .select('client_id')
                .eq('barber_id', user?.id);

            if (blockedData) {
                setBlockedClientIds(new Set(blockedData.map(b => b.client_id)));
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }

    async function blockClient(clientId: string, clientName: string) {
        if (!confirm(`Are you sure you want to block ${clientName}? They will no longer be able to book appointments with you.`)) return;

        try {
            const { error } = await supabase
                .from('blocked_clients')
                .insert({
                    barber_id: user?.id,
                    client_id: clientId,
                    reason: 'Blocked from bookings management'
                });

            if (error) {
                if (error.code === '23505') {
                    toast.error('Client is already blocked');
                } else {
                    throw error;
                }
            } else {
                toast.success(`${clientName} has been blocked`);
                setBlockedClientIds(prev => new Set(prev).add(clientId));
            }
        } catch (error) {
            console.error('Error blocking client:', error);
            toast.error('Failed to block client');
        }
    }

    async function unblockClient(clientId: string, clientName: string) {
        try {
            const { error } = await supabase
                .from('blocked_clients')
                .delete()
                .eq('barber_id', user?.id)
                .eq('client_id', clientId);

            if (error) throw error;

            toast.success(`${clientName} has been unblocked`);
            setBlockedClientIds(prev => {
                const next = new Set(prev);
                next.delete(clientId);
                return next;
            });
        } catch (error) {
            console.error('Error unblocking client:', error);
            toast.error('Failed to unblock client');
        }
    }

    async function updateBookingStatus(id: string, status: string) {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Booking ${status}`);
            fetchBookings();
        } catch (error) {
            console.error('Error updating booking:', error);
            toast.error('Failed to update status');
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'completed': return 'bg-primary/10 text-primary border-primary/20';
            default: return 'bg-muted text-muted-foreground';
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
        <DashboardLayout role="barber">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Booking Management</h1>
                    <p className="text-muted-foreground">Monitor and manage your appointments.</p>
                </div>

                <div className="space-y-4">
                    {bookings.map((booking) => (
                        <Card
                            key={booking.id}
                            id={`booking-${booking.id}`}
                            className={`overflow-hidden border-border/50 hover:border-primary/30 transition-all ${highlightedBookingId === booking.id
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(var(--primary),0.2)] border-primary bg-primary/5'
                                : ''
                                }`}
                        >
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                                    {/* Client Info */}
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {booking.profiles?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{booking.profiles?.full_name || 'Anonymous Client'}</p>
                                            <Badge variant="outline" className={getStatusColor(booking.status)}>
                                                {booking.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Appointment Details */}
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            {format(new Date(booking.start_time), 'PPP')}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="w-4 h-4 text-primary" />
                                            {format(new Date(booking.start_time), 'p')} - {format(new Date(booking.end_time), 'p')}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <span className="text-primary truncate">{booking.services?.name}</span>
                                            <span className="text-muted-foreground ml-auto">{booking.total_price} DH</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 ml-auto">
                                        {booking.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Cancel
                                                </Button>
                                            </>
                                        )}
                                        {booking.status === 'confirmed' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-primary text-primary hover:bg-primary hover:text-white"
                                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                            >
                                                Mark Completed
                                            </Button>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                                                    Cancel Booking
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>View Client History</DropdownMenuItem>
                                                <div className="h-px bg-border my-1" />
                                                {blockedClientIds.has(booking.client_id) ? (
                                                    <DropdownMenuItem
                                                        className="text-primary focus:text-primary focus:bg-primary/10"
                                                        onClick={() => unblockClient(booking.client_id, booking.profiles?.full_name || 'Anonymous')}
                                                    >
                                                        Unblock Client
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        onClick={() => blockClient(booking.client_id, booking.profiles?.full_name || 'Anonymous')}
                                                    >
                                                        Block Client
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {bookings.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-muted rounded-xl">
                            <Calendar className="w-12 h-12 text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No bookings found</h3>
                            <p className="text-muted-foreground">You don't have any appointments at the moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function BookingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <BookingsList />
        </Suspense>
    );
}
