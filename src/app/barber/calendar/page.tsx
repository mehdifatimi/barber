'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';

const DAYS = [
    { id: 0, name: 'Sunday' },
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
];

export default function CalendarPage() {
    const { user } = useAuth();
    const [availability, setAvailability] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAvailability();
        } else {
            setLoading(false);
        }
    }, [user]);

    async function fetchAvailability() {
        try {
            const { data, error } = await supabase
                .from('barber_availability')
                .select('*')
                .eq('barber_id', user?.id)
                .order('day_of_week', { ascending: true });

            if (error) throw error;

            // Fill missing days
            const fullAvailability = DAYS.map(day => {
                const existing = data?.find(a => a.day_of_week === day.id);
                return existing || {
                    day_of_week: day.id,
                    start_time: '09:00',
                    end_time: '18:00',
                    is_enabled: false,
                };
            });

            setAvailability(fullAvailability);
        } catch (error) {
            console.error('Error fetching availability:', error);
            toast.error('Failed to load availability');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const dataToUpsert = availability.map(a => ({
                barber_id: user?.id,
                day_of_week: a.day_of_week,
                start_time: a.start_time,
                end_time: a.end_time,
                is_enabled: a.is_enabled,
            }));

            const { error } = await supabase
                .from('barber_availability')
                .upsert(dataToUpsert, { onConflict: 'barber_id, day_of_week' });

            if (error) throw error;
            toast.success('Availability updated successfully');
        } catch (error) {
            console.error('Error saving availability:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    }

    const updateDay = (dayIndex: number, fields: any) => {
        setAvailability(prev => prev.map((a, i) => i === dayIndex ? { ...a, ...fields } : a));
    };

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
                        <h1 className="text-3xl font-bold">Planning & Availability</h1>
                        <p className="text-muted-foreground">Set your weekly working hours and availability.</p>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-primary">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Schedule
                    </Button>
                </div>

                <Card className="shadow-lg border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Weekly Schedule
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border">
                        {availability.map((day, index) => (
                            <div key={day.day_of_week} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-[150px]">
                                    <Switch
                                        checked={day.is_enabled}
                                        onCheckedChange={(checked) => updateDay(index, { is_enabled: checked })}
                                    />
                                    <span className={`font-medium ${day.is_enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {DAYS[day.day_of_week].name}
                                    </span>
                                </div>

                                <div className={`flex items-center gap-4 transition-opacity ${day.is_enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground">From</Label>
                                        <Input
                                            type="time"
                                            value={day.start_time}
                                            onChange={(e) => updateDay(index, { start_time: e.target.value })}
                                            className="w-32"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground">To</Label>
                                        <Input
                                            type="time"
                                            value={day.end_time}
                                            onChange={(e) => updateDay(index, { end_time: e.target.value })}
                                            className="w-32"
                                        />
                                    </div>
                                </div>

                                <Badge variant={day.is_enabled ? 'outline' : 'secondary'} className={day.is_enabled ? 'text-primary border-primary/20 bg-primary/5' : ''}>
                                    {day.is_enabled ? 'Open' : 'Closed'}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Holiday Mode</h4>
                                    <p className="text-sm text-muted-foreground">Coming soon: Block off specific dates for holidays or personal time.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Clock className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Buffer Time</h4>
                                    <p className="text-sm text-muted-foreground">Coming soon: Add break times between appointments automatically.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
