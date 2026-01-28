'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Scissors,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Loader2,
    AlertCircle,
    User,
    Mail,
    MapPin
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBarbersPage() {
    const [barbers, setBarbers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchBarbers();
    }, []);

    async function fetchBarbers() {
        try {
            const { data, error } = await supabase
                .from('barbers')
                .select('*, profiles(full_name, avatar_url, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBarbers(data || []);
        } catch (error) {
            console.error('Error fetching barbers:', error);
            toast.error('Failed to load barbers');
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('barbers')
                .update({ verification_status: status })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Barber status updated to ${status}`);
            setBarbers(barbers.map(b => b.id === id ? { ...b, verification_status: status } : b));
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setProcessingId(null);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold">Approved</Badge>;
            case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-bold">Pending</Badge>;
            case 'rejected': return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 font-bold">Rejected</Badge>;
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
                    <h1 className="text-4xl font-black tracking-tight">Barber Validation</h1>
                    <p className="text-muted-foreground mt-2">Manage barber applications and platform access.</p>
                </div>

                <div className="grid gap-6">
                    {barbers.map((barber) => (
                        <Card key={barber.id} className="overflow-hidden border-border/50 hover:border-primary/20 transition-all rounded-3xl shadow-xl bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-0">
                                <div className="flex flex-col lg:flex-row items-center">
                                    {/* Avatar & Basic Info */}
                                    <div className="p-8 flex-1 flex flex-col md:flex-row items-center gap-8">
                                        <div className="w-24 h-24 rounded-3xl bg-muted overflow-hidden relative group">
                                            {barber.profiles?.avatar_url ? (
                                                <img src={barber.profiles.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-black text-2xl text-muted-foreground/30">
                                                    {barber.profiles?.full_name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 text-center md:text-left space-y-2">
                                            <div className="flex items-center justify-center md:justify-start gap-3">
                                                <h3 className="text-2xl font-black">{barber.profiles?.full_name}</h3>
                                                {getStatusBadge(barber.verification_status)}
                                            </div>

                                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground font-medium">
                                                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-primary" /> {barber.profiles?.email}</span>
                                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {barber.address || 'No address'}</span>
                                            </div>

                                            <p className="text-sm italic line-clamp-2 max-w-xl">
                                                "{barber.bio || 'No biography provided.'}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="p-8 bg-muted/20 w-full lg:w-auto flex lg:flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-border/50">
                                        <Button
                                            variant="outline"
                                            className="flex-1 lg:w-40 rounded-xl"
                                            asChild
                                        >
                                            <a href={`/admin/barbers/${barber.id}`}>
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Review Profile
                                            </a>
                                        </Button>

                                        {barber.verification_status === 'pending' && (
                                            <>
                                                <Button
                                                    className="flex-1 lg:w-40 rounded-xl bg-primary hover:bg-primary/90"
                                                    disabled={processingId === barber.id}
                                                    onClick={() => updateStatus(barber.id, 'approved')}
                                                >
                                                    {processingId === barber.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    className="flex-1 lg:w-40 rounded-xl"
                                                    disabled={processingId === barber.id}
                                                    onClick={() => updateStatus(barber.id, 'rejected')}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Reject
                                                </Button>
                                            </>
                                        )}

                                        {barber.verification_status !== 'pending' && (
                                            <Button
                                                variant="ghost"
                                                className="flex-1 lg:w-40 rounded-xl text-muted-foreground hover:text-primary"
                                                onClick={() => updateStatus(barber.id, 'pending')}
                                            >
                                                Revoke status
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {barbers.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4 bg-muted/10 rounded-3xl border-2 border-dashed border-border">
                            <AlertCircle className="w-12 h-12 text-muted-foreground/30" />
                            <h3 className="text-2xl font-bold">No barbers registered</h3>
                            <p className="text-muted-foreground">Wait for your first professional to join the platform.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
