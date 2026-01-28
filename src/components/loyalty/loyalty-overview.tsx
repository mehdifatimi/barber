'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gift, Star, Award, Scissors } from 'lucide-react';
import Link from 'next/link';

export default function LoyaltyOverview({ clientId }: { clientId: string }) {
    const [loyalty, setLoyalty] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (clientId) fetchLoyalty();
    }, [clientId]);

    async function fetchLoyalty() {
        try {
            const { data, error } = await supabase
                .from('loyalty_points')
                .select('*, barbers!inner(id, profiles!inner(full_name, avatar_url))')
                .eq('client_id', clientId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setLoyalty(data || []);
        } catch (error) {
            console.error('Error fetching loyalty points:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading || loyalty.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                    <Award className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">Your Loyalty Rewards</h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest">Collect points & get free cuts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loyalty.map((item) => {
                    const points = item.points_balance;
                    const nextReward = 100; // Default threshold
                    const progress = Math.min((points / nextReward) * 100, 100);

                    return (
                        <Card key={item.id} className="relative overflow-hidden group border-orange-500/20 bg-orange-500/[0.02] hover:bg-orange-500/[0.05] transition-all duration-500 rounded-[2rem] shadow-xl shadow-orange-500/5">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-muted border border-border">
                                        {item.barbers.profiles.avatar_url ? (
                                            <img
                                                src={item.barbers.profiles.avatar_url}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <Scissors className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-lg truncate">{item.barbers.profiles.full_name}</p>
                                        <Link href={`/barber/${item.barber_id}`} className="text-xs text-orange-500 font-bold hover:underline">
                                            Book again
                                        </Link>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-orange-500">{points}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Points</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">Progress to reward</span>
                                        <span className="text-orange-500">{progress.toFixed(0)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2 bg-orange-500/10" />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <div className={`p-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest ${points >= nextReward ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground/50'}`}>
                                        <Gift className="w-4 h-4" />
                                        {points >= nextReward ? 'Reward Available!' : `${nextReward - points} points left`}
                                    </div>
                                </div>
                            </CardContent>

                            {/* Decorative Background */}
                            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-orange-500/10 blur-[40px] rounded-full group-hover:bg-orange-500/20 transition-all" />
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
