'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import BeforeAfterSlider from '@/components/portfolio/before-after-slider';

export default function PortfolioManager({ barberId }: { barberId: string }) {
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const [newStory, setNewStory] = useState({
        before_url: '',
        after_url: '',
        title: '',
        description: ''
    });

    useEffect(() => {
        fetchStories();
    }, [barberId]);

    async function fetchStories() {
        try {
            const { data, error } = await supabase
                .from('portfolio_stories')
                .select('*')
                .eq('barber_id', barberId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStories(data || []);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddStory() {
        if (!newStory.before_url || !newStory.after_url) {
            toast.error('Please provide both before and after image URLs');
            return;
        }

        setAdding(true);
        try {
            const { error } = await supabase
                .from('portfolio_stories')
                .insert({
                    barber_id: barberId,
                    before_image_url: newStory.before_url,
                    after_image_url: newStory.after_url,
                    title: newStory.title,
                    description: newStory.description
                });

            if (error) throw error;

            toast.success('Portfolio story added!');
            setNewStory({ before_url: '', after_url: '', title: '', description: '' });
            fetchStories();
        } catch (error) {
            console.error('Error adding story:', error);
            toast.error('Failed to add story');
        } finally {
            setAdding(false);
        }
    }

    async function handleDeleteStory(id: string) {
        if (!confirm('Delete this portfolio story?')) return;

        try {
            const { error } = await supabase
                .from('portfolio_stories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setStories(stories.filter(s => s.id !== id));
            toast.success('Story removed');
        } catch (error) {
            console.error('Error deleting story:', error);
            toast.error('Failed to delete story');
        }
    }

    return (
        <Card className="shadow-lg border-border/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Before & After Portfolio
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Add New Story */}
                <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Add New transformation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Before Image URL</Label>
                            <Input
                                placeholder="https://..."
                                value={newStory.before_url}
                                onChange={e => setNewStory({ ...newStory, before_url: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>After Image URL</Label>
                            <Input
                                placeholder="https://..."
                                value={newStory.after_url}
                                onChange={e => setNewStory({ ...newStory, after_url: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Title (Optional)</Label>
                        <Input
                            placeholder="e.g. Sharp Fade & Beard Trim"
                            value={newStory.title}
                            onChange={e => setNewStory({ ...newStory, title: e.target.value })}
                        />
                    </div>
                    <Button
                        onClick={handleAddStory}
                        disabled={adding}
                        className="w-full"
                    >
                        {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Save Transformation
                    </Button>
                </div>

                {/* List Stories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {stories.map(story => (
                        <div key={story.id} className="relative group">
                            <BeforeAfterSlider
                                beforeImage={story.before_image_url}
                                afterImage={story.after_image_url}
                                title={story.title}
                                description={story.description}
                            />
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                                onClick={() => handleDeleteStory(story.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}

                    {!loading && stories.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                            <p>No transformations added yet. Show off your skills!</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
