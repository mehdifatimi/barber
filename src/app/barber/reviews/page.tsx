'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Star, User, Calendar, MessageSquareReply } from 'lucide-react';
import { format } from 'date-fns';
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
import { toast } from 'sonner';

export default function ReviewsPage() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    async function handleSubmitReply() {
        if (!replyingTo || !replyText.trim()) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .update({
                    barber_reply: replyText,
                    replied_at: new Date().toISOString()
                })
                .eq('id', replyingTo);

            if (error) throw error;

            toast.success('Reply saved successfully');
            setReplyingTo(null);
            setReplyText('');
            fetchReviews();
        } catch (error) {
            console.error('Error saving reply:', error);
            toast.error('Failed to save reply');
        } finally {
            setSubmitting(false);
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
                                <p className="text-sm text-foreground/80 leading-relaxed italic mb-4">
                                    "{review.comment || 'No comment left.'}"
                                </p>

                                {review.barber_reply ? (
                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
                                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-primary">
                                            <span>Your Reply</span>
                                            <span className="text-muted-foreground">
                                                {format(new Date(review.replied_at), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                        <p className="text-sm italic text-foreground/70 leading-relaxed">
                                            "{review.barber_reply}"
                                        </p>
                                    </div>
                                ) : (
                                    <Dialog open={replyingTo === review.id} onOpenChange={(open) => {
                                        if (!open) setReplyingTo(null);
                                        else {
                                            setReplyingTo(review.id);
                                            setReplyText('');
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full h-9 rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold gap-2">
                                                <MessageSquareReply className="w-3.5 h-3.5" />
                                                Reply to Review
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Reply to {review.profiles?.full_name}</DialogTitle>
                                                <DialogDescription>
                                                    Address the client's feedback. This response will be visible on your public profile.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="p-3 bg-muted rounded-lg text-sm italic opacity-70 border border-border">
                                                    "{review.comment || 'No comment left.'}"
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase tracking-widest opacity-60">Your Message</label>
                                                    <Textarea
                                                        placeholder="Thank you for the review! I'm glad you enjoyed the cut..."
                                                        rows={4}
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    onClick={handleSubmitReply}
                                                    disabled={submitting || !replyText.trim()}
                                                    className="w-full bg-primary"
                                                >
                                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                    Post Reply
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
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
