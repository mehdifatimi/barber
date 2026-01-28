'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Star,
    MapPin,
    Clock,
    Scissors,
    ArrowLeft,
    Loader2,
    User,
    Mail,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AdminBarberDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [barber, setBarber] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [gallery, setGallery] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchBarberDetails();
    }, [id]);

    async function fetchBarberDetails() {
        console.log('[Admin] Fetching barber details for ID:', id);
        try {
            const [barberRes, servicesRes, galleryRes] = await Promise.all([
                supabase
                    .from('barbers')
                    .select('*, profiles(full_name, avatar_url, email)')
                    .eq('id', id)
                    .single(),
                supabase.from('services').select('*').eq('barber_id', id),
                supabase.from('gallery').select('*').eq('barber_id', id),
            ]);

            console.log('[Admin] Barber Response:', barberRes);

            // If barber record not found, check if profile exists and auto-create
            if (barberRes.error || !barberRes.data) {
                console.warn('[Admin] Barber record not found, checking profile...');

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, role, email, full_name')
                    .eq('id', id)
                    .single();

                console.log('[Admin] Profile check:', { profile, profileError });

                if (profile && profile.role === 'barber') {
                    console.log('[Admin] Profile exists as barber, auto-creating barber record...');

                    const { error: insertError } = await supabase
                        .from('barbers')
                        .insert({
                            id: profile.id,
                            bio: '',
                            address: '',
                            verification_status: 'pending'
                        });

                    if (insertError) {
                        console.error('[Admin] Failed to auto-create barber record:', insertError);
                        throw insertError;
                    }

                    console.log('[Admin] Barber record created successfully, retrying fetch...');

                    const { data: retryBarber, error: retryError } = await supabase
                        .from('barbers')
                        .select('*, profiles(full_name, avatar_url, email)')
                        .eq('id', id)
                        .single();

                    if (retryError) {
                        console.error('[Admin] Retry fetch failed:', retryError);
                        throw retryError;
                    }

                    setBarber(retryBarber);
                    setServices(servicesRes.data || []);
                    setGallery(galleryRes.data || []);
                    toast.success('Barber record auto-created successfully');
                    return;
                }

                console.error('[Admin] Profile not found or not a barber');
                throw barberRes.error || new Error('Barber not found');
            }

            setBarber(barberRes.data);
            setServices(servicesRes.data || []);
            setGallery(galleryRes.data || []);
        } catch (error) {
            console.error('[Admin] Error fetching barber details:', error);
            toast.error('Failed to load barber details');
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(status: 'approved' | 'rejected' | 'pending') {
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('barbers')
                .update({ verification_status: status })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Barber status updated to ${status}`);
            setBarber({ ...barber, verification_status: status });
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setProcessing(false);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold text-lg px-4 py-1">Approved</Badge>;
            case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-bold text-lg px-4 py-1">Pending Review</Badge>;
            case 'rejected': return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 font-bold text-lg px-4 py-1">Rejected</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <DashboardLayout role="admin">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!barber) {
        return (
            <DashboardLayout role="admin">
                <div className="text-center py-20">
                    <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-muted-foreground">Barber not found</h2>
                    <Button variant="link" onClick={() => router.back()} className="mt-4">
                        Go back
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="admin">
            <div className="space-y-8">
                {/* Header / Back Navigation */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-primary/10">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Barber Profile Review</h1>
                            <p className="text-muted-foreground mt-1">Review and manage barber application</p>
                        </div>
                    </div>
                    {getStatusBadge(barber.verification_status)}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile Info */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Profile Info Card */}
                        <Card className="border-border/50 shadow-2xl overflow-hidden rounded-3xl bg-card/50 backdrop-blur-md">
                            <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
                            <div className="px-8 pb-8 -mt-16">
                                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                                    <div className="inline-block p-1.5 bg-background rounded-3xl shadow-xl">
                                        {barber.profiles?.avatar_url ? (
                                            <img src={barber.profiles.avatar_url} className="w-32 h-32 rounded-2xl object-cover" alt={barber.profiles.full_name} />
                                        ) : (
                                            <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center">
                                                <User className="w-16 h-16 text-muted-foreground/30" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                        <h2 className="text-3xl font-extrabold">{barber.profiles?.full_name || 'No name'}</h2>
                                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-2 text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <Mail className="w-4 h-4 text-primary" />
                                                {barber.profiles?.email}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-primary" />
                                                {barber.address || 'No address provided'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 pb-8 border-t border-border/50 pt-8">
                                <h3 className="text-lg font-bold mb-3 uppercase tracking-wider text-primary">Biography</h3>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                    {barber.bio || "This barber hasn't added a biography yet."}
                                </p>
                            </div>
                        </Card>

                        {/* Services Section */}
                        <Card className="border-border/50 shadow-2xl rounded-3xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Scissors className="w-5 h-5 text-primary" />
                                    Services Offered
                                    <Badge variant="outline" className="ml-auto border-primary/20 text-primary">{services.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {services.length > 0 ? (
                                    services.map((service) => (
                                        <div key={service.id} className="p-4 rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all bg-card/30">
                                            <div className="flex gap-4 items-center">
                                                {/* Service Image */}
                                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                                                    {service.image_url ? (
                                                        <img
                                                            src={service.image_url}
                                                            alt={service.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
                                                            <Scissors className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-bold text-lg">{service.name}</h4>
                                                        <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                                                        <div className="flex items-center text-sm text-muted-foreground mt-1 gap-3">
                                                            <span className="flex items-center gap-1 bg-background/50 px-2 py-0.5 rounded-md border border-border/50">
                                                                <Clock className="w-3 h-3" /> {service.duration_minutes} min
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-extrabold text-primary">{service.price} DH</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No services listed yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Gallery Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Scissors className="w-5 h-5 text-primary" />
                                Portfolio Gallery
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {gallery.length > 0 ? (
                                    gallery.map((img) => (
                                        <div key={img.id} className="aspect-square rounded-2xl overflow-hidden group relative border border-border/50">
                                            <img src={img.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={img.title || 'Gallery image'} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 bg-muted/30 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                                        <p className="text-muted-foreground">No photos in gallery yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Admin Actions */}
                    <div className="space-y-6">
                        <Card className="border-border/50 shadow-2xl rounded-3xl sticky top-8">
                            <CardHeader>
                                <CardTitle>Admin Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {barber.verification_status === 'pending' && (
                                    <>
                                        <Button
                                            className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                            disabled={processing}
                                            onClick={() => updateStatus('approved')}
                                        >
                                            {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                            Approve Barber
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="w-full rounded-xl"
                                            disabled={processing}
                                            onClick={() => updateStatus('rejected')}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Reject Application
                                        </Button>
                                    </>
                                )}

                                {barber.verification_status === 'approved' && (
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-xl border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/10"
                                        onClick={() => updateStatus('pending')}
                                    >
                                        Set to Pending
                                    </Button>
                                )}

                                {barber.verification_status === 'rejected' && (
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-xl"
                                        onClick={() => updateStatus('pending')}
                                    >
                                        Reconsider Application
                                    </Button>
                                )}

                                <div className="pt-4 border-t border-border/50">
                                    <Button
                                        variant="ghost"
                                        className="w-full rounded-xl"
                                        onClick={() => router.push('/admin/barbers')}
                                    >
                                        Back to Barbers List
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats */}
                        <Card className="border-border/50 shadow-2xl rounded-3xl">
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Services</span>
                                    <span className="font-bold">{services.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Gallery Photos</span>
                                    <span className="font-bold">{gallery.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Rating</span>
                                    <span className="font-bold flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        {barber.rating || 'N/A'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
