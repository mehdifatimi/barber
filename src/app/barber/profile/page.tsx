'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, MapPin, Camera, Trash2, Plus, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import PortfolioManager from '@/components/barber/portfolio-manager';

export default function BarberProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile Data
    const [profile, setProfile] = useState({
        bio: '',
        address: '',
        location_lat: 0,
        location_lng: 0,
        avatar_url: '',
        full_name: '',
        city_id: '',
        neighborhood_id: '',
    });

    // Location Data
    const [cities, setCities] = useState<any[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);

    // Gallery Data
    const [gallery, setGallery] = useState<any[]>([]);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (user) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user]);

    async function fetchData() {
        try {
            setLoading(true);
            // Fetch Cities
            const { data: citiesData } = await supabase.from('cities').select('*').order('name');
            setCities(citiesData || []);

            // Fetch Barber Info + Profile Avatar
            const { data: barberData, error: barberError } = await supabase
                .from('barbers')
                .select('*, profiles(full_name, avatar_url)')
                .eq('id', user?.id)
                .single();

            if (barberError && barberError.code !== 'PGRST116') throw barberError;

            // Fetch Gallery
            const { data: galleryData, error: galleryError } = await supabase
                .from('gallery')
                .select('*')
                .eq('barber_id', user?.id)
                .order('created_at', { ascending: false });

            if (galleryError) throw galleryError;

            if (barberData) {
                setProfile({
                    bio: barberData.bio || '',
                    address: barberData.address || '',
                    location_lat: barberData.location_lat || 0,
                    location_lng: barberData.location_lng || 0,
                    avatar_url: barberData.profiles?.avatar_url || '',
                    full_name: barberData.profiles?.full_name || '',
                    city_id: barberData.city_id || '',
                    neighborhood_id: barberData.neighborhood_id || '',
                });

                // Fetch Neighborhoods for the current city
                if (barberData.city_id) {
                    const { data: nbData } = await supabase
                        .from('neighborhoods')
                        .select('*')
                        .eq('city_id', barberData.city_id)
                        .order('name');
                    setNeighborhoods(nbData || []);
                }
            }

            setGallery(galleryData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    }

    // Fetch neighborhoods when city changes
    async function handleCityChange(cityId: string) {
        setProfile({ ...profile, city_id: cityId, neighborhood_id: '' });
        if (!cityId) {
            setNeighborhoods([]);
            return;
        }
        const { data } = await supabase
            .from('neighborhoods')
            .select('*')
            .eq('city_id', cityId)
            .order('name');
        setNeighborhoods(data || []);
    }

    async function handleSaveProfile() {
        setSaving(true);
        try {
            // Update Barbers Table
            const { error: barberError } = await supabase
                .from('barbers')
                .upsert({
                    id: user?.id,
                    bio: profile.bio,
                    address: profile.address,
                    city_id: profile.city_id || null,
                    neighborhood_id: profile.neighborhood_id || null,
                    updated_at: new Date().toISOString(),
                });

            if (barberError) {
                console.error('[Profile] Error updating barber info:', barberError);
                throw barberError;
            }

            // Update Profiles Table (Name)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: profile.full_name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (profileError) {
                console.error('[Profile] Error updating name:', profileError);
                throw profileError;
            }

            toast.success('Profile updated successfully');
        } catch (error: any) {
            console.error('Error saving profile:', error.message || error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/avatar_${Date.now()}.${fileExt}`;
        setUploadingAvatar(true);

        try {
            // Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, avatar_url: publicUrl });
            toast.success('Avatar updated');
        } catch (error) {
            console.error('Avatar upload failed:', error);
            toast.error('Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploadingGallery(true);
        const files = Array.from(e.target.files);
        let successCount = 0;

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user?.id}/gallery_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                // Upload
                const { error: uploadError } = await supabase.storage
                    .from('gallery')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error('Upload failed for', file.name, uploadError);
                    continue;
                }

                // Get URL
                const { data: { publicUrl } } = supabase.storage
                    .from('gallery')
                    .getPublicUrl(fileName);

                // Insert to Database
                const { error: dbError } = await supabase
                    .from('gallery')
                    .insert({
                        barber_id: user?.id,
                        image_url: publicUrl,
                        type: 'standard'
                    });

                if (!dbError) successCount++;
            }

            if (successCount > 0) {
                toast.success(`${successCount} images uploaded`);
                fetchData(); // Refresh gallery
            } else {
                toast.error('No images were uploaded');
            }
        } catch (error) {
            console.error('Gallery upload error:', error);
            toast.error('Error uploading images');
        } finally {
            setUploadingGallery(false);
        }
    }

    async function handleGalleryUrlAdd(url: string) {
        if (!url) return;
        setUploadingGallery(true);
        try {
            const { error } = await supabase
                .from('gallery')
                .insert({
                    barber_id: user?.id,
                    image_url: url,
                    type: 'standard'
                });

            if (error) throw error;
            toast.success('Image added from URL');
            fetchData();
        } catch (error) {
            console.error('Error adding image from URL:', error);
            toast.error('Failed to add image');
        } finally {
            setUploadingGallery(false);
        }
    }

    async function handleAvatarUrlUpdate(url: string) {
        if (!url) return;
        setUploadingAvatar(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: url })
                .eq('id', user?.id);

            if (error) throw error;
            setProfile({ ...profile, avatar_url: url });
            toast.success('Avatar updated from URL');
        } catch (error) {
            console.error('Error updating avatar URL:', error);
            toast.error('Failed to update avatar');
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleDeleteImage(id: string) {
        if (!confirm('Are you sure you want to delete this photo?')) return;

        try {
            const { error } = await supabase
                .from('gallery')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Photo removed');
            setGallery(gallery.filter(img => img.id !== id));
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete photo');
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
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Profile Management</h1>
                    <p className="text-muted-foreground">Manage your bio, location, and professional gallery.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Basic Info */}
                    <Card className="lg:col-span-1 shadow-lg border-border/50 h-fit">
                        <CardHeader>
                            <CardTitle>Profile Picture</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-6">
                            <div className="relative group w-40 h-40 rounded-full overflow-hidden border-4 border-muted">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <Camera className="w-12 h-12" />
                                    </div>
                                )}

                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    {uploadingAvatar ? (
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    ) : (
                                        <div className="text-white font-medium flex flex-col items-center">
                                            <UploadCloud className="w-6 h-6 mb-1" />
                                            <span>Change</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                        disabled={uploadingAvatar}
                                    />
                                </label>
                            </div>

                            <div className="w-full flex gap-2">
                                <Input
                                    placeholder="Or paste avatar URL"
                                    className="text-xs h-8"
                                    onBlur={(e) => handleAvatarUrlUpdate(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAvatarUrlUpdate(e.currentTarget.value);
                                    }}
                                />
                            </div>

                            <div className="w-full space-y-2">
                                <Label>Display Name</Label>
                                <Input
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    placeholder="Your Name"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Middle Column: Bio & Location */}
                    <Card className="lg:col-span-2 shadow-lg border-border/50">
                        <CardHeader>
                            <CardTitle>Professional Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bio">Biography</Label>
                                <Textarea
                                    id="bio"
                                    placeholder="Tell clients about your experience and style..."
                                    value={profile.bio}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    rows={5}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <select
                                        value={profile.city_id}
                                        onChange={(e) => handleCityChange(e.target.value)}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm"
                                    >
                                        <option value="">Select City</option>
                                        {cities.map(city => (
                                            <option key={city.id} value={city.id}>{city.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Neighborhood (Cartier)</Label>
                                    <select
                                        value={profile.neighborhood_id}
                                        onChange={(e) => setProfile({ ...profile, neighborhood_id: e.target.value })}
                                        disabled={!profile.city_id}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none disabled:opacity-50 text-sm"
                                    >
                                        <option value="">Select Neighborhood</option>
                                        {neighborhoods.map(nb => (
                                            <option key={nb.id} value={nb.id}>{nb.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="address"
                                        className="pl-10"
                                        placeholder="Your shop address"
                                        value={profile.address}
                                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:scale-[1.02] transition-transform"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Full Width: Gallery */}
                    <Card className="lg:col-span-3 shadow-lg border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Gallery</CardTitle>
                            <label className="cursor-pointer">
                                <Button variant="outline" size="sm" asChild className="pointer-events-none">
                                    <span>
                                        {uploadingGallery ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        Add Photos
                                    </span>
                                </Button>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleGalleryUpload}
                                    disabled={uploadingGallery}
                                />
                            </label>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2 items-center max-w-sm">
                                <Input
                                    placeholder="Add image via URL..."
                                    className="h-8 text-sm"
                                    id="gallery-url-input"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleGalleryUrlAdd(e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        const input = document.getElementById('gallery-url-input') as HTMLInputElement;
                                        if (input) {
                                            handleGalleryUrlAdd(input.value);
                                            input.value = '';
                                        }
                                    }}
                                >
                                    Add
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {gallery.map((img) => (
                                    <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden shadow-sm border border-border">
                                        <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => handleDeleteImage(img.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty State */}
                                {gallery.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                                        <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No photos yet. Add some to show off your work!</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Full Width: Portfolio */}
                    <div className="lg:col-span-3">
                        <PortfolioManager barberId={user?.id || ''} />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
