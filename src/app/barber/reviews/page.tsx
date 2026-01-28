'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ReviewsPage() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchReviews();
        } else {
            setLoading(false);
        }
    }, [user]);

    async function fetchReviews() {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    profiles:client_id (full_name, avatar_url),
                    bookings:booking_id (services:service_id (name))
                `)
                .eq('barber_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReviews(data || []);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    }

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
            />
        ));
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
                    <h1 className="text-3xl font-bold">Client Reviews</h1>
                    <p className="text-muted-foreground">See what your clients are saying about your work.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <span className="text-4xl font-bold text-primary">
                                    {reviews.length > 0
                                        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                                        : '0.0'}
                                </span>
                                <div className="flex">
                                    {renderStars(Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0))}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Based on {reviews.length} reviews</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {reviews.map((review) => (
                        <Card key={review.id} className="border-border/50 shadow-md hover:border-primary/30 transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                                            {review.profiles?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{review.profiles?.full_name || 'Anonymous Client'}</p>
                                            <div className="flex">{renderStars(review.rating)}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Badge variant="secondary" className="mb-2 text-[10px] uppercase font-bold tracking-wider">
                                    {review.bookings?.services?.name || 'Haircut Service'}
                                </Badge>
                                <p className="text-sm text-foreground/80 leading-relaxed italic">
                                    "{review.comment || 'No comment left.'}"
                                </p>
                            </CardContent>
                        </Card>
                    ))}

                    {reviews.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-muted rounded-xl">
                            <Star className="w-12 h-12 text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No reviews yet</h3>
                            <p className="text-muted-foreground">Reviews will appear here once clients start booking and rating your services.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
