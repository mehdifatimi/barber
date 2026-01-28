'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Calendar as CalendarIcon,
    Clock,
    Scissors,
    MapPin,
    Star,
    Loader2,
    CheckCircle2,
    XCircle,
    Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function ClientBookingsList() {
    const searchParams = useSearchParams();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewContent, setReviewContent] = useState({ rating: 5, comment: '', bookingId: '' });
    const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);
    const [reviewedBarberIds, setReviewedBarberIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchBookings();
    }, []);

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
            }, 500);

            // Remove highlight after 5 seconds
            const timer = setTimeout(() => {
                setHighlightedBookingId(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, loading, bookings]);

    async function fetchBookings() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    barbers:barber_id (
                        profiles(full_name, avatar_url),
                        address
                    ),
                    services:service_id (name, price),
                    reviews (id, rating, comment)
                `)
                .eq('client_id', user.id)
                .order('start_time', { ascending: false });

            if (error) throw error;
            setBookings(data || []);

            // Also fetch all reviews by this client to identify which barbers are already reviewed
            const { data: userReviews, error: reviewsError } = await supabase
                .from('reviews')
                .select('barber_id')
                .eq('client_id', user.id);

            if (!reviewsError && userReviews) {
                setReviewedBarberIds(new Set(userReviews.map(r => r.barber_id)));
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Failed to load your bookings');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitReview() {
        if (!reviewContent.bookingId) return;

        setSubmittingReview(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const booking = bookings.find(b => b.id === reviewContent.bookingId);

            const { error } = await supabase
                .from('reviews')
                .insert({
                    booking_id: reviewContent.bookingId,
                    client_id: user?.id,
                    barber_id: booking.barber_id,
                    rating: reviewContent.rating,
                    comment: reviewContent.comment,
                });

            if (error) throw error;

            toast.success('Review submitted! Thank you.');
            fetchBookings();
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    }

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
        <DashboardLayout role="client">
            <div className="space-y-8 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Your Appointments</h1>
                    <p className="text-muted-foreground mt-2">Track your style history and manage your bookings.</p>
                </div>

                <div className="space-y-6">
                    {bookings.length > 0 ? (
                        bookings.map((booking) => (
                            <Card
                                key={booking.id}
                                id={`booking-${booking.id}`}
                                className={`overflow-hidden border-border/50 hover:border-primary/20 transition-all rounded-2xl shadow-lg ${highlightedBookingId === booking.id
                                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(var(--primary),0.2)] border-primary bg-primary/5'
                                    : ''
                                    }`}
                            >
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/50">
                                        {/* Main Info */}
                                        <div className="p-6 flex-1 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                                        <Scissors className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold">{booking.services?.name}</h3>
                                                        <p className="text-muted-foreground font-medium">with {booking.barbers?.profiles?.full_name}</p>
                                                    </div>
                                                </div>
                                                {getStatusBadge(booking.status)}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-border/20 pt-4 mt-4">
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <CalendarIcon className="w-4 h-4 text-primary" />
                                                    {format(new Date(booking.start_time), 'PPP')}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <Clock className="w-4 h-4 text-primary" />
                                                    {format(new Date(booking.start_time), 'p')} - {format(new Date(booking.end_time), 'p')}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <MapPin className="w-4 h-4 text-primary" />
                                                    <span className="truncate">{booking.barbers?.address}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions / Review Section */}
                                        <div className="p-6 min-w-[200px] flex flex-col justify-center gap-4 bg-muted/20">
                                            <div className="text-center md:text-right">
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Price Paid</p>
                                                <p className="text-2xl font-black text-primary">{booking.total_price} DH</p>
                                            </div>

                                            {(booking.status === 'completed' || booking.status === 'confirmed') && !reviewedBarberIds.has(booking.barber_id) && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="default"
                                                            className="w-full rounded-xl bg-primary hover:bg-primary/90"
                                                            onClick={() => setReviewContent({ ...reviewContent, bookingId: booking.id })}
                                                        >
                                                            <Star className="w-4 h-4 mr-2" />
                                                            Leave Review
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[425px]">
                                                        <DialogHeader>
                                                            <DialogTitle>Rate your experience</DialogTitle>
                                                            <DialogDescription>
                                                                How was your haircut with {booking.barbers?.profiles?.full_name}?
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-6 py-4">
                                                            <div className="space-y-4">
                                                                <Label className="text-center block">Rating</Label>
                                                                <div className="flex justify-center gap-2">
                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                        <button
                                                                            key={star}
                                                                            onClick={() => setReviewContent({ ...reviewContent, rating: star })}
                                                                            className="focus:outline-none transition-transform hover:scale-110"
                                                                        >
                                                                            <Star
                                                                                className={`w-10 h-10 ${reviewContent.rating >= star
                                                                                    ? 'text-yellow-500 fill-yellow-500'
                                                                                    : 'text-muted-foreground'
                                                                                    }`}
                                                                            />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="comment">Your feedback</Label>
                                                                <Textarea
                                                                    id="comment"
                                                                    placeholder="Share your experience..."
                                                                    value={reviewContent.comment}
                                                                    onChange={(e) => setReviewContent({ ...reviewContent, comment: e.target.value })}
                                                                    rows={4}
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                onClick={handleSubmitReview}
                                                                disabled={submittingReview}
                                                                className="w-full bg-primary"
                                                            >
                                                                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                                Submit Review
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}

                                            {booking.reviews?.[0] && (
                                                <div className="space-y-2 text-center md:text-right">
                                                    <div className="flex justify-center md:justify-end gap-0.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-4 h-4 ${i < booking.reviews[0].rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs italic text-muted-foreground line-clamp-2">
                                                        "{booking.reviews[0].comment}"
                                                    </p>
                                                </div>
                                            )}

                                            {booking.status === 'pending' && (
                                                <Button variant="outline" className="w-full rounded-xl" disabled>
                                                    Awaiting confirmation
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-20 text-center bg-card/30 rounded-3xl border-2 border-dashed border-border">
                            <CalendarIcon className="w-16 h-16 text-muted mx-auto mb-6 opacity-20" />
                            <h3 className="text-2xl font-bold">No bookings yet</h3>
                            <p className="text-muted-foreground text-lg mb-8">You haven't scheduled any appointments yet.</p>
                            <Link href="/client/dashboard">
                                <Button className="rounded-2xl px-8 h-12 bg-primary hover:bg-primary/90">
                                    Find a Barber
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function ClientBookingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <ClientBookingsList />
        </Suspense>
    );
}
