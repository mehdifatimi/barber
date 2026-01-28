'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock, Scissors, ChevronRight, ArrowLeft, Loader2, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import BeforeAfterSlider from '@/components/portfolio/before-after-slider';

export default function BarberProfileView({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [barber, setBarber] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [gallery, setGallery] = useState<any[]>([]);
    const [portfolioStories, setPortfolioStories] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEligible, setIsEligible] = useState(false);
    const [userBooking, setUserBooking] = useState<any>(null);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewContent, setReviewContent] = useState({ rating: 5, comment: '' });

    useEffect(() => {
        fetchBarberDetails();
    }, [id]);

    async function fetchBarberDetails() {
        console.log('[Debug] fetchBarberDetails called with ID:', id);
        try {
            const [barberRes, servicesRes, galleryRes, reviewsRes, portfolioRes] = await Promise.all([
                supabase
                    .from('barbers')
                    .select('*, profiles(full_name, avatar_url)')
                    .eq('id', id)
                    .single(),
                supabase.from('services').select('*').eq('barber_id', id),
                supabase.from('gallery').select('*').eq('barber_id', id),
                supabase
                    .from('reviews')
                    .select('*, profiles:client_id(full_name, avatar_url)')
                    .eq('barber_id', id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('portfolio_stories')
                    .select('*')
                    .eq('barber_id', id)
                    .order('created_at', { ascending: false }),
            ]);

            console.log('[Debug] Barber Response:', JSON.stringify(barberRes, null, 2));

            // If barber record not found, check if profile exists and auto-create
            if (barberRes.error || !barberRes.data) {
                console.warn('[Debug] Barber record not found, checking profile...');

                // Check if profile exists with role='barber'
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('id', id)
                    .single();

                console.log('[Debug] Profile check:', { profile, profileError });

                if (profile && profile.role === 'barber') {
                    console.log('[Debug] Profile exists as barber, auto-creating barber record...');

                    // Auto-create the missing barber record
                    const { error: insertError } = await supabase
                        .from('barbers')
                        .insert({
                            id: profile.id,
                            bio: '',
                            address: '',
                            verification_status: 'pending'
                        });

                    if (insertError) {
                        console.error('[Debug] Failed to auto-create barber record:', insertError);
                        throw insertError;
                    }

                    console.log('[Debug] Barber record created successfully, retrying fetch...');

                    // Retry fetching the barber details
                    const { data: retryBarber, error: retryError } = await supabase
                        .from('barbers')
                        .select('*, profiles(full_name, avatar_url)')
                        .eq('id', id)
                        .single();

                    if (retryError) {
                        console.error('[Debug] Retry fetch failed:', retryError);
                        throw retryError;
                    }

                    setBarber(retryBarber);
                    setServices(servicesRes.data || []);
                    setGallery(galleryRes.data || []);
                    setPortfolioStories(portfolioRes.data || []);
                    await checkEligibility();
                    return;
                }

                // If profile doesn't exist or isn't a barber, throw the original error
                console.error('[Debug] Profile not found or not a barber');
                throw barberRes.error || new Error('Barber not found');
            }

            setBarber(barberRes.data);
            setServices(servicesRes.data || []);
            setGallery(galleryRes.data || []);
            setPortfolioStories(portfolioRes.data || []);
            setReviews(reviewsRes.data || []);

            await checkEligibility();
        } catch (error) {
            console.error('[Debug] Catch block error:', error);
            // Let barber stay null, which will show "Barber not found" UI
        } finally {
            setLoading(false);
        }
    }

    async function checkEligibility() {
        // Check if current user is eligible to leave a review
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Check for a completed booking without a review
            const { data: eligibilityData } = await supabase
                .from('bookings')
                .select('id, barber_id, status')
                .eq('client_id', user.id)
                .eq('barber_id', id)
                .in('status', ['completed', 'confirmed'])
                .limit(1);

            if (eligibilityData && eligibilityData.length > 0) {
                // Check if this user already reviewed this barber
                const { data: existingReview } = await supabase
                    .from('reviews')
                    .select('id')
                    .eq('client_id', user.id)
                    .eq('barber_id', id)
                    .limit(1);

                if (!existingReview || existingReview.length === 0) {
                    setIsEligible(true);
                    setUserBooking(eligibilityData[0]);
                } else {
                    setIsEligible(false);
                }
            } else {
                setIsEligible(false);
            }
        }
    }

    async function handleSubmitReview() {
        if (!userBooking) return;

        setSubmittingReview(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('reviews')
                .insert({
                    booking_id: userBooking.id,
                    client_id: user?.id,
                    barber_id: id,
                    rating: reviewContent.rating,
                    comment: reviewContent.comment,
                });

            if (error) throw error;

            toast.success('Review submitted! Thank you.');
            setIsEligible(false); // Hide button after submission
            fetchBarberDetails(); // Refresh reviews
        } catch (error: any) {
            console.error('Error submitting review:', error);
            toast.error(error.message || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!barber) {
        return (
            <DashboardLayout role="client">
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-muted-foreground">Barber not found</h2>
                    <Button variant="link" onClick={() => router.back()} className="mt-4">
                        Go back
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="client">
            <div className="space-y-8">
                {/* Header / Back Navigation */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-primary/10">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Barber Profile</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Info & Gallery */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Profile Info Card */}
                        <Card className="border-border/50 shadow-2xl overflow-hidden rounded-3xl bg-card/50 backdrop-blur-md">
                            <div className="h-32 sm:h-40 bg-gradient-to-r from-primary/20 to-primary/5" />
                            <div className="px-5 sm:px-8 pb-6 sm:pb-8 -mt-12 sm:-mt-16 text-center sm:text-left sm:flex sm:items-end sm:gap-6">
                                <div className="inline-block p-1 bg-background rounded-3xl shadow-xl mx-auto sm:mx-0">
                                    {barber.profiles.avatar_url ? (
                                        <img src={barber.profiles.avatar_url} className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover" />
                                    ) : (
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-muted flex items-center justify-center">
                                            <User className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-extrabold">{barber.profiles.full_name}</h2>
                                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 sm:gap-4 mt-2 text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="font-bold text-foreground">{barber.rating || 'N/A'}</span>
                                            <span className="text-xs text-muted-foreground ml-1">({barber.reviews_count || 0} reviews)</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4 text-primary" />
                                            {barber.address}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 sm:px-8 pb-6 sm:pb-8 border-t border-border/50 pt-6 sm:pt-8">
                                <h3 className="text-lg font-bold mb-3 uppercase tracking-wider text-primary">About</h3>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                    {barber.bio || "This barber hasn't added a biography yet. They are dedicated to providing excellent grooming services."}
                                </p>
                            </div>
                        </Card>

                        {/* Portfolio (Before & After) Section */}
                        {portfolioStories.length > 0 && (
                            <div className="space-y-6 pt-4">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Star className="w-5 h-5 text-primary fill-primary" />
                                    Transformations (Before & After)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {portfolioStories.map((story) => (
                                        <BeforeAfterSlider
                                            key={story.id}
                                            beforeImage={story.before_image_url}
                                            afterImage={story.after_image_url}
                                            title={story.title}
                                            description={story.description}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Gallery Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Scissors className="w-5 h-5 text-primary" />
                                Showcase & Gallery
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {gallery.length > 0 ? (
                                    gallery.map((img) => (
                                        <div key={img.id} className="aspect-square rounded-2xl overflow-hidden group relative">
                                            <img src={img.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button size="sm" variant="outline" className="text-white border-white hover:bg-white hover:text-black">View Full</Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 bg-muted/30 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                                        <p className="text-muted-foreground">No photos in gallery yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="space-y-6 pt-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    Client Reviews ({reviews.length})
                                </h3>

                                {isEligible && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5 text-primary">
                                                <Star className="w-4 h-4 mr-2" />
                                                Rate this Barber
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Rate your experience</DialogTitle>
                                                <DialogDescription>
                                                    How was your haircut with {barber.profiles.full_name}?
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
                            </div>

                            <div className="space-y-4">
                                {reviews.length > 0 ? (
                                    reviews.map((review) => (
                                        <Card key={review.id} className="border-border/40 bg-card/30 backdrop-blur-sm rounded-2xl">
                                            <CardContent className="p-4 sm:p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-muted flex overflow-hidden">
                                                            {review.profiles?.avatar_url ? (
                                                                <img src={review.profiles.avatar_url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                                    <User className="w-6 h-6" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold">{review.profiles?.full_name || 'Verified Client'}</p>
                                                            <p className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'PPP')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-0.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-foreground/80 leading-relaxed italic">
                                                    "{review.comment}"
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="py-12 text-center bg-muted/20 rounded-3xl border-2 border-dashed border-border">
                                        <Star className="w-12 h-12 text-muted mx-auto mb-4 opacity-20" />
                                        <p className="text-muted-foreground font-medium">No reviews yet. Be the first to rate!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Services & Selection */}
                    <div className="space-y-6">
                        <Card className="border-border/50 shadow-2xl rounded-3xl sticky top-8">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    Available Services
                                    <Badge variant="outline" className="border-primary/20 text-primary">{services.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {services.map((service) => (
                                    <Link key={service.id} href={`/booking/${service.id}`}>
                                        <div className="group p-4 rounded-2xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all mb-3 bg-card/30">
                                            <div className="flex gap-4 items-center">
                                                {/* Service Image */}
                                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                                                    {service.image_url ? (
                                                        <img
                                                            src={service.image_url}
                                                            alt={service.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
                                                            <Scissors className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{service.name}</h4>
                                                        <div className="flex items-center text-sm text-muted-foreground mt-1 gap-3">
                                                            <span className="flex items-center gap-1 bg-background/50 px-2 py-0.5 rounded-md border border-border/50">
                                                                <Clock className="w-3 h-3" /> {service.duration_minutes} min
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-extrabold text-primary">{service.price} DH</div>
                                                        <Button size="sm" className="mt-2 rounded-full px-4 h-8 bg-primary hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Book
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {services.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">No services listed yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
