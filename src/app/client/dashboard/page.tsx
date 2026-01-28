'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Star, Filter, Loader2, Scissors, User, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import LoyaltyOverview from '@/components/loyalty/loyalty-overview';

export default function ClientDashboard() {
    const { user } = useAuth();
    const [barbers, setBarbers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Location States
    const [cities, setCities] = useState<any[]>([]);
    const [allNeighborhoods, setAllNeighborhoods] = useState<any[]>([]);
    const [filteredNeighborhoods, setFilteredNeighborhoods] = useState<any[]>([]);
    const [selectedCityId, setSelectedCityId] = useState<string>('all');
    const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>('all');

    useEffect(() => {
        fetchData().then(() => generateSuggestions());
    }, []);

    const generateSuggestions = () => {
        // Simple logic: sort by rating if not enough data for complex engine
        const sorted = [...barbers].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
        setSuggestions(sorted);
    };

    async function fetchData() {
        try {
            let barbersResult: any = await supabase
                .from('barbers')
                .select(`
                    id,
                    address,
                    rating,
                    reviews_count,
                    city_id,
                    neighborhood_id,
                    profiles!inner(full_name, avatar_url),
                    services(name, price, category_id),
                    cities(name),
                    neighborhoods(name)
                `)
                .eq('verification_status', 'approved');

            // Fallback if reviews_count doesn't exist yet
            if (barbersResult.error && (barbersResult.error.code === '42703' || barbersResult.error.message?.includes('reviews_count'))) {
                console.warn('[Debug] reviews_count column missing, retrying without it...');
                barbersResult = await supabase
                    .from('barbers')
                    .select(`
                        id,
                        address,
                        rating,
                        city_id,
                        neighborhood_id,
                        profiles!inner(full_name, avatar_url),
                        services(name, price, category_id),
                        cities(name),
                        neighborhoods(name)
                    `)
                    .eq('verification_status', 'approved');
            }

            const [categoriesRes, citiesRes, neighborhoodsRes] = await Promise.all([
                supabase.from('categories').select('*'),
                supabase.from('cities').select('*').order('name'),
                supabase.from('neighborhoods').select('*').order('name'),
            ]);

            if (barbersResult.error) {
                console.error('Supabase error (barbers):', barbersResult.error);
                throw barbersResult.error;
            }
            if (categoriesRes.error) throw categoriesRes.error;

            setBarbers(barbersResult.data || []);
            setCategories(categoriesRes.data || []);
            setCities(citiesRes.data || []);
            setAllNeighborhoods(neighborhoodsRes.data || []);
        } catch (error: any) {
            console.error('Error fetching data:', error);
            // Provide more info in the console
            if (error.message) console.error('Error message:', error.message);
            if (error.hint) console.error('Error hint:', error.hint);
            if (error.details) console.error('Error details:', error.details);
        } finally {
            setLoading(false);
        }
    }

    // Filter neighborhoods when city selection changes
    useEffect(() => {
        if (selectedCityId === 'all') {
            setFilteredNeighborhoods([]);
            setSelectedNeighborhoodId('all');
        } else {
            const filtered = allNeighborhoods.filter(n => n.city_id === selectedCityId);
            setFilteredNeighborhoods(filtered);
            setSelectedNeighborhoodId('all');
        }
    }, [selectedCityId, allNeighborhoods]);

    const filteredBarbers = barbers.filter(barber => {
        const matchesSearch =
            barber.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            barber.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (barber.cities?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (barber.neighborhoods?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = !selectedCategory || barber.services.some((s: any) => s.category_id === selectedCategory);
        const matchesCity = selectedCityId === 'all' || barber.city_id === selectedCityId;
        const matchesNeighborhood = selectedNeighborhoodId === 'all' || barber.neighborhood_id === selectedNeighborhoodId;

        return matchesSearch && matchesCategory && matchesCity && matchesNeighborhood;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <DashboardLayout role="client">
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Find Your Style
                        </h1>
                        <p className="text-muted-foreground text-lg">Book with the best barbers in your area.</p>
                    </div>
                </div>

                {/* Loyalty Overview */}
                <LoyaltyOverview clientId={user?.id || ''} />

                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Find a barber, city or neighborhood..."
                            className="pl-12 h-12 sm:h-14 text-base sm:text-lg bg-card border-border/50 shadow-lg rounded-2xl focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
                        <select
                            value={selectedCityId}
                            onChange={(e) => setSelectedCityId(e.target.value)}
                            className="h-12 sm:h-14 px-4 bg-card border border-border/50 shadow-lg rounded-2xl focus:ring-primary/20 focus:outline-none w-full sm:min-w-[140px]"
                        >
                            <option value="all">All Cities</option>
                            {cities.map(city => (
                                <option key={city.id} value={city.id}>{city.name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedNeighborhoodId}
                            onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                            disabled={selectedCityId === 'all'}
                            className="h-12 sm:h-14 px-4 bg-card border border-border/50 shadow-lg rounded-2xl focus:ring-primary/20 focus:outline-none w-full sm:min-w-[160px] disabled:opacity-50"
                        >
                            <option value="all">All Neighborhoods</option>
                            {filteredNeighborhoods.map(nb => (
                                <option key={nb.id} value={nb.id}>{nb.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <Button
                            variant={selectedCategory === null ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory(null)}
                            className="rounded-full px-6 whitespace-nowrap"
                        >
                            All
                        </Button>
                        {categories.map((cat) => (
                            <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(cat.id)}
                                className="rounded-full px-6 whitespace-nowrap"
                            >
                                {cat.name}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Smart Suggestions */}
                {suggestions.length > 0 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <TrendingUp className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Recommended for You</h2>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest">Based on ratings & style</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {suggestions.map((barber) => (
                                <Link href={`/barber/${barber.id}`} key={`suggest-${barber.id}`}>
                                    <div className="group relative overflow-hidden rounded-[2rem] border border-primary/20 bg-primary/5 p-6 hover:bg-primary/10 transition-all duration-500 shadow-xl shadow-primary/5">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center font-black text-xl border border-primary/10 overflow-hidden shrink-0">
                                                {barber.profiles?.avatar_url ? (
                                                    <img src={barber.profiles.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    barber.profiles?.full_name?.charAt(0)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-lg truncate group-hover:text-primary transition-colors">{barber.profiles?.full_name}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <div className="flex items-center gap-1.5 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                                        <Star className="w-2.5 h-2.5 fill-current" /> {barber.rating || 'New'}
                                                        <span className="opacity-70 font-normal">({barber.reviews_count || 0})</span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Premium Choice</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                    {filteredBarbers.map((barber) => (
                        <Link key={barber.id} href={`/barber/${barber.id}`}>
                            <Card className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 shadow-xl hover:shadow-primary/5 rounded-2xl bg-card/50 backdrop-blur-sm">
                                <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                                    {barber.profiles.avatar_url ? (
                                        <img src={barber.profiles.avatar_url} alt={barber.profiles.full_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                            <User className="w-12 h-12 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4">
                                        <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border/50 font-bold px-3 py-1 flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                            {barber.rating || 'New'}
                                            <span className="text-[10px] text-muted-foreground ml-1">({barber.reviews_count || 0})</span>
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-6">
                                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{barber.profiles.full_name}</h3>
                                    <div className="flex flex-col gap-1 mt-2">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <MapPin className="w-4 h-4 mr-1 text-primary shrink-0" />
                                            <p className="truncate">
                                                {barber.cities?.name && barber.neighborhoods?.name ?
                                                    `${barber.neighborhoods.name}, ${barber.cities.name}` :
                                                    barber.address || 'Location not specified'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-border/50">
                                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Featured Services</p>
                                        <div className="flex flex-wrap gap-2">
                                            {barber.services.slice(0, 2).map((service: any) => (
                                                <Badge key={service.name} variant="secondary" className="bg-primary/5 text-primary border-none font-medium">
                                                    {service.name}
                                                </Badge>
                                            ))}
                                            {barber.services.length > 2 && (
                                                <span className="text-xs text-muted-foreground self-center">+{barber.services.length - 2} more</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {filteredBarbers.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-card/30 rounded-3xl border-2 border-dashed border-border">
                            <Scissors className="w-16 h-16 text-muted mx-auto mb-6 opacity-20" />
                            <h3 className="text-2xl font-bold">No barbers found</h3>
                            <p className="text-muted-foreground text-lg">Try adjusting your search or filters to find what you're looking for.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
