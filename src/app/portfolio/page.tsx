'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Scissors, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import BeforeAfterSlider from '@/components/portfolio/before-after-slider';
import { Loader2 } from 'lucide-react';

export default function PortfolioPage() {
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStories();
    }, []);

    async function fetchStories() {
        try {
            const { data, error } = await supabase
                .from('portfolio_stories')
                .select('*, barbers!inner(id, profiles!inner(full_name, avatar_url))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStories(data || []);
        } catch (error) {
            console.error('Error fetching portfolio stories:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navbar */}
            <nav className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Scissors className="text-primary w-8 h-8" />
                        <span className="text-2xl font-bold tracking-tighter">BarberApp</span>
                    </Link>
                    <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                        Back to Home
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
                <div className="text-center space-y-4 mb-16">
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight uppercase">
                        Style <span className="text-primary">Gallery</span>
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        Browse real transformations and find the perfect barber for your next look.
                    </p>
                </div>

                {stories.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16">
                        {stories.map((story) => (
                            <div key={story.id} className="space-y-6 bg-card/30 p-6 sm:p-8 rounded-[2.5rem] border border-border/50 group hover:border-primary/30 transition-all shadow-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border">
                                            {story.barbers.profiles.avatar_url ? (
                                                <img
                                                    src={story.barbers.profiles.avatar_url}
                                                    alt={story.barbers.profiles.full_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <User className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-black tracking-widest leading-none mb-1">Created By</p>
                                            <p className="font-bold text-lg">{story.barbers.profiles.full_name}</p>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/barber/${story.barber_id}`}
                                        className="h-10 px-4 bg-primary text-black rounded-full text-xs font-black flex items-center gap-2 hover:scale-105 transition-transform"
                                    >
                                        BOOK NOW
                                        <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>

                                <BeforeAfterSlider
                                    beforeImage={story.before_image_url}
                                    afterImage={story.after_image_url}
                                    title={story.title}
                                    description={story.description}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-card/30 rounded-[3rem] border border-dashed border-border">
                        <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-bold">No transformations showcased yet</h3>
                        <p className="text-muted-foreground mt-2">Check back later or browse our barbers!</p>
                        <Link href="/" className="inline-block mt-8 px-8 py-3 bg-primary text-black rounded-full font-black">
                            BROWSE BARBERS
                        </Link>
                    </div>
                )}
            </main>

            <footer className="py-20 border-t border-border mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
                    <p>© 2026 BarberApp. The art of precision.</p>
                </div>
            </footer>
        </div>
    );
}
