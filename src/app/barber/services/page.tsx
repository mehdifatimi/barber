'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit2, Scissors, Image as ImageIcon } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ServicesPage() {
    const { user } = useAuth();
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    // New state for image file and url
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [newService, setNewService] = useState({
        name: '',
        description: '',
        price: '',
        duration_minutes: '30',
        // Removed category_id
    });

    useEffect(() => {
        if (user) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user]);

    async function fetchData() {
        try {
            // Removed categories fetch
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('barber_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setServices(data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setNewService({ name: '', description: '', price: '', duration_minutes: '30' });
        setImageFile(null);
        setImageUrlInput('');
        setEditingId(null);
        setIsAddOpen(false);
    }

    function handleEditService(service: any) {
        setEditingId(service.id);
        setNewService({
            name: service.name,
            description: service.description || '',
            price: service.price.toString(),
            duration_minutes: service.duration_minutes.toString(),
        });
        setImageUrlInput(service.image_url || '');
        setIsAddOpen(true);
    }

    async function handleSaveService() {
        if (!newService.name || !newService.price || !newService.duration_minutes) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            let image_url = imageUrlInput; // Default to input URL

            // 1. Upload Image if exists (Overwrites URL)
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `services/${user?.id}/${Date.now()}.${fileExt}`;

                // Using 'gallery' bucket for now as planned
                const { error: uploadError } = await supabase.storage
                    .from('gallery') // Reusing gallery bucket
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('gallery')
                    .getPublicUrl(fileName);

                image_url = publicUrl;
            }

            // 2. Insert or Update Service
            const serviceData = {
                barber_id: user?.id,
                name: newService.name,
                description: newService.description,
                price: parseFloat(newService.price),
                duration_minutes: parseInt(newService.duration_minutes),
                image_url: image_url, // Add/Update image_url
            };

            let error;
            if (editingId) {
                const { error: updateError } = await supabase
                    .from('services')
                    .update(serviceData)
                    .eq('id', editingId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('services')
                    .insert(serviceData);
                error = insertError;
            }

            if (error) throw error;
            toast.success(editingId ? 'Service updated successfully' : 'Service added successfully');
            resetForm();
            setImageFile(null);
            setImageUrlInput('');
            fetchData();
        } catch (error) {
            console.error('Error adding service:', error);
            toast.error('Failed to add service');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteService(id: string) {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            const { error } = await supabase.from('services').delete().eq('id', id);
            if (error) throw error;
            toast.success('Service deleted');
            fetchData();
        } catch (error) {
            console.error('Error deleting service:', error);
            toast.error('Failed to delete service');
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
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Services & Pricing</h1>
                        <p className="text-muted-foreground">Manage your haircut styles, treatments, and prices.</p>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={(open) => {
                        setIsAddOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Service
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="image" className="block text-sm font-medium">Service Image</Label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border shrink-0">
                                                {imageFile ? (
                                                    <img
                                                        src={URL.createObjectURL(imageFile)}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : imageUrlInput ? (
                                                    <img
                                                        src={imageUrlInput}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    id="image"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                                    className="cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-muted" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                                            </div>
                                        </div>
                                        <Input
                                            placeholder="Paste image URL here..."
                                            value={imageUrlInput}
                                            onChange={(e) => setImageUrlInput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Service Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Fade & Beard Trim"
                                        value={newService.name}
                                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Price (DH)</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            placeholder="100"
                                            value={newService.price}
                                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (min)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            placeholder="30"
                                            value={newService.duration_minutes}
                                            onChange={(e) => setNewService({ ...newService, duration_minutes: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Short description of the service"
                                        value={newService.description}
                                        onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                        className="resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleSaveService} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {editingId ? 'Update Service' : 'Create Service'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <Card key={service.id} className="relative group overflow-hidden border-border/50 hover:border-primary/50 transition-all shadow-md flex flex-col">
                            {service.image_url && (
                                <div className="h-48 w-full overflow-hidden bg-muted relative">
                                    <img
                                        src={service.image_url}
                                        alt={service.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image';
                                        }}
                                    />
                                </div>
                            )}
                            <CardHeader className={`${service.image_url ? 'pt-4' : 'pt-6'} pb-2 flex-1`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{service.name}</CardTitle>
                                    </div>
                                    <div className="flex gap-1 absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-sm opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => handleEditService(service)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteService(service.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                    {service.description || 'No description provided.'}
                                </p>
                            </CardHeader>
                            <CardContent className="pt-0 mt-auto pb-4">
                                <div className="flex justify-between items-end border-t border-border pt-3">
                                    <p className="text-xs text-muted-foreground flex items-center font-medium">
                                        <span className="inline-block w-2 h-2 rounded-full bg-primary/50 mr-2"></span>
                                        {service.duration_minutes} min
                                    </p>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-primary">{service.price}</span>
                                        <span className="text-xs text-muted-foreground ml-1 font-medium">DH</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {services.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-muted rounded-xl bg-card/50">
                            <Scissors className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No services found</h3>
                            <p className="text-muted-foreground">Start adding services to your profile to receive bookings.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
