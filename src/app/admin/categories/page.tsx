'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Plus,
    Trash2,
    FolderEdit,
    Loader2,
    Scissors,
    AlertCircle,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState({ name: '', description: '', icon_url: '' });
    const [submitting, setSubmitting] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    }

    async function handleAddCategory() {
        if (!newCategory.name) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('categories')
                .insert(newCategory);

            if (error) throw error;

            toast.success('Category created successfully');
            setNewCategory({ name: '', description: '', icon_url: '' });
            setIsAddDialogOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Error creating category:', error);
            toast.error('Failed to create category');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteCategory(id: string) {
        if (!confirm('Are you sure you want to delete this category? This might affect existing services.')) return;

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Category deleted');
            setCategories(categories.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Failed to delete category. It might be in use.');
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
        <DashboardLayout role="admin">
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">Category Management</h1>
                        <p className="text-muted-foreground mt-2">Organize services into clear, searchable categories.</p>
                    </div>

                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-2xl bg-primary hover:bg-primary/90 h-14 px-8 text-lg font-bold shadow-2xl shadow-primary/20">
                                <Plus className="w-5 h-5 mr-2" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New Category</DialogTitle>
                                <DialogDescription>
                                    Add a new classification for services on the platform.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Traditional Haircut"
                                        value={newCategory.name}
                                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Input
                                        id="description"
                                        placeholder="Quick description..."
                                        value={newCategory.description}
                                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={handleAddCategory}
                                    className="w-full bg-primary"
                                    disabled={submitting || !newCategory.name}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Save Category
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((category) => (
                        <Card key={category.id} className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all rounded-3xl shadow-xl bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    <Scissors className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">{category.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">ID: {category.id.slice(0, 8)}</p>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                    {category.description || 'No description provided for this category.'}
                                </p>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button size="icon" variant="ghost" className="rounded-xl hover:bg-primary/10 hover:text-primary">
                                        <FolderEdit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => handleDeleteCategory(category.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Check className="w-4 h-4 text-green-500" />
                            </div>
                        </Card>
                    ))}

                    {categories.length === 0 && (
                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-muted/10 rounded-3xl border-2 border-dashed border-border">
                            <AlertCircle className="w-12 h-12 text-muted-foreground/30" />
                            <h3 className="text-2xl font-bold">No categories found</h3>
                            <p className="text-muted-foreground font-medium">Start by adding your first service category.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
