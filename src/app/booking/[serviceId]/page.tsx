'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Scissors, CreditCard, Loader2, Calendar as CalendarIcon, CheckCircle2, XCircle } from 'lucide-react';
import { format, addMinutes, isAfter, isBefore, startOfDay, parse } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function BookingPage({ params }: { params: Promise<{ serviceId: string }> }) {
    const { serviceId } = use(params);
    const router = useRouter();
    const [service, setService] = useState<any>(null);
    const [barber, setBarber] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<{ time: string; isAvailable: boolean; isTaken: boolean }[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        fetchServiceAndBarber();
    }, [serviceId]);

    useEffect(() => {
        if (selectedDate && barber) {
            calculateAvailableSlots();
        }
    }, [selectedDate, barber]);

    async function fetchServiceAndBarber() {
        try {
            const { data: serviceData, error: serviceError } = await supabase
                .from('services')
                .select('*, barbers(*, profiles(full_name))')
                .eq('id', serviceId)
                .single();

            if (serviceError) throw serviceError;
            setService(serviceData);
            setBarber(serviceData.barbers);

            // Check if user is blocked
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: blockData } = await supabase
                    .from('blocked_clients')
                    .select('id')
                    .eq('barber_id', serviceData.barbers.id)
                    .eq('client_id', user.id)
                    .maybeSingle();

                if (blockData) {
                    setIsBlocked(true);
                }
            }
        } catch (error) {
            console.error('Error fetching service:', error);
            toast.error('Service not found');
        } finally {
            setLoading(false);
        }
    }

    async function calculateAvailableSlots() {
        if (!selectedDate || !barber) return;

        try {
            const dayOfWeek = selectedDate.getDay();
            console.log('[Booking] Calculating slots for day:', dayOfWeek, 'Date:', selectedDate);

            // 1. Get barber's availability for this day
            let { data: availability, error: availError } = await supabase
                .from('barber_availability')
                .select('*')
                .eq('barber_id', barber.id)
                .eq('day_of_week', dayOfWeek)
                .eq('is_enabled', true)
                .single();

            console.log('[Booking] Availability query result:', { availability, availError });

            // Auto-create default availability if none exists
            if (availError || !availability) {
                console.log('[Booking] No availability found, creating default schedule for barber:', barber.id);

                // Use RPC to create default availability (bypasses RLS with SECURITY DEFINER)
                const { error: rpcError } = await supabase
                    .rpc('create_default_barber_availability', {
                        p_barber_id: barber.id
                    });



                if (rpcError) {
                    console.error('[Booking] Failed to create default availability:', rpcError);
                    toast.error('Failed to load availability. Please try again.');
                    setAvailableSlots([]);
                    return;
                }

                console.log('[Booking] Default availability created successfully');
                toast.success('Default schedule loaded for this barber');

                // Retry fetching availability for the selected day
                const { data: retryAvailability, error: retryError } = await supabase
                    .from('barber_availability')
                    .select('*')
                    .eq('barber_id', barber.id)
                    .eq('day_of_week', dayOfWeek)
                    .eq('is_enabled', true)
                    .single();

                if (retryError || !retryAvailability) {
                    console.error('[Booking] Retry failed:', retryError);
                    setAvailableSlots([]);
                    return;
                }

                availability = retryAvailability;
                console.log('[Booking] Retry successful, availability:', availability);
            }

            if (!availability) {
                console.log('[Booking] No availability for this day (day is disabled)');
                setAvailableSlots([]);
                return;
            }

            // 2. Get existing bookings for this day
            const startOfSelectedDay = new Date(selectedDate);
            startOfSelectedDay.setHours(0, 0, 0, 0);
            const endOfSelectedDay = new Date(selectedDate);
            endOfSelectedDay.setHours(23, 59, 59, 999);

            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('start_time, end_time')
                .eq('barber_id', barber.id)
                .neq('status', 'cancelled')
                .gte('start_time', startOfSelectedDay.toISOString())
                .lte('start_time', endOfSelectedDay.toISOString());

            if (bookingsError) {
                console.error('[Booking] Error fetching bookings:', bookingsError);
                throw bookingsError;
            }

            console.log('[Booking] Existing bookings:', bookings);

            // 3. Generate slots
            const slots: { time: string; isAvailable: boolean; isTaken: boolean }[] = [];
            let current = parse(availability.start_time, 'HH:mm:ss', selectedDate);
            const end = parse(availability.end_time, 'HH:mm:ss', selectedDate);
            const duration = service.duration_minutes;

            console.log('[Booking] Generating slots from', format(current, 'HH:mm'), 'to', format(end, 'HH:mm'), 'with duration', duration, 'minutes');

            while (isBefore(current, end)) {
                const slotStart = current;
                const slotEnd = addMinutes(current, duration);

                if (isAfter(slotEnd, end)) break;

                // Check for overlap with existing bookings
                const isTaken = bookings?.some(booking => {
                    const bStart = new Date(booking.start_time);
                    const bEnd = new Date(booking.end_time);
                    return (isBefore(slotStart, bEnd) && isAfter(slotEnd, bStart));
                });

                // Check if slot is in the past for today
                const now = new Date();
                const isPast = isBefore(slotStart, now);

                slots.push({
                    time: format(slotStart, 'HH:mm'),
                    isAvailable: !isTaken && !isPast,
                    isTaken: !!isTaken
                });

                current = addMinutes(current, 30); // 30-min intervals
            }

            console.log('[Booking] Generated', slots.length, 'total slots');
            setAvailableSlots(slots);
            setSelectedSlot(null); // Reset selection when slots change
        } catch (error) {
            console.error('[Booking] Error calculating slots:', error);
            toast.error('Failed to load available time slots');
        }
    }

    async function handleConfirmBooking() {
        if (!selectedSlot || !selectedDate) return;

        setProcessing(true);
        try {
            const startTime = parse(selectedSlot, 'HH:mm', selectedDate);
            const endTime = addMinutes(startTime, service.duration_minutes);

            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('bookings')
                .insert({
                    client_id: user?.id,
                    barber_id: barber.id,
                    service_id: service.id,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    total_price: service.price,
                    status: 'pending' // Usually 'pending' until payment is done
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Booking initiated! Redirecting to payment...');

            // Here you would redirect to Stripe checkout
            // For now, we'll simulate a success and go to my bookings
            setTimeout(() => {
                router.push('/client/dashboard/bookings');
            }, 2000);

        } catch (error) {
            console.error('Error creating booking:', error);
            toast.error('Failed to create booking');
        } finally {
            setProcessing(false);
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
        <DashboardLayout role="client">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Complete Your Booking</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Select your preferred date and time for {service.name}.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Step 1: Date Selection */}
                    <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-border/50">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <CalendarIcon className="w-5 h-5" />
                                Select Date
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                                className="rounded-xl border border-border/50 shadow-inner"
                            />
                        </CardContent>
                    </Card>

                    {/* Step 2: Time Selection */}
                    <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-border/50">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Clock className="w-5 h-5" />
                                Select Time
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            {availableSlots.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-3 gap-2 sm:gap-3">
                                    {availableSlots.map((slot) => (
                                        <Button
                                            key={slot.time}
                                            variant={selectedSlot === slot.time ? 'default' : 'outline'}
                                            onClick={() => slot.isAvailable && setSelectedSlot(slot.time)}
                                            disabled={!slot.isAvailable}
                                            className={`rounded-2xl h-12 font-bold transition-all ${selectedSlot === slot.time
                                                ? 'bg-primary shadow-lg shadow-primary/20'
                                                : slot.isTaken
                                                    ? 'bg-red-500/10 border-red-500/50 text-red-500 cursor-not-allowed'
                                                    : !slot.isAvailable
                                                        ? 'opacity-40 cursor-not-allowed bg-muted/30 border-dashed'
                                                        : 'hover:border-primary/50 hover:bg-primary/5'
                                                }`}
                                        >
                                            {slot.time}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                                        <Clock className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground font-medium">No available slots for this date.</p>
                                    <p className="text-xs text-muted-foreground/60">Try selecting another day.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Step 3: Summary & Payment */}
                <Card className="border-border/50 shadow-2xl rounded-3xl bg-card/80 backdrop-blur-xl border-t-4 border-t-primary overflow-hidden">
                    <CardContent className="p-5 sm:p-8">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 sm:gap-8">
                            <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto">
                                <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center text-primary shrink-0">
                                    <Scissors className="w-8 h-8" />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold">{service.name}</h3>
                                    <p className="text-sm sm:text-base text-muted-foreground font-medium">with {barber.profiles.full_name}</p>
                                    <p className="text-sm flex items-center gap-1 text-primary/80 font-bold">
                                        <CalendarIcon className="w-4 h-4" />
                                        {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
                                        {selectedSlot && ` at ${selectedSlot}`}
                                    </p>
                                </div>
                            </div>

                            <div className="text-center lg:text-right w-full lg:w-auto space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-widest font-bold">Total Price</p>
                                    <div className="text-3xl sm:text-4xl font-black text-primary">{service.price} DH</div>
                                </div>

                                {isBlocked ? (
                                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-2xl flex items-center gap-3">
                                        <XCircle className="w-5 h-5 shrink-0" />
                                        <p className="text-sm font-bold">You are blocked from booking with this barber.</p>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full lg:w-auto rounded-2xl px-12 h-14 sm:h-16 text-lg font-black bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 transform hover:scale-105 transition-all disabled:opacity-50"
                                        disabled={!selectedSlot || processing}
                                        onClick={handleConfirmBooking}
                                    >
                                        {processing ? (
                                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                        ) : (
                                            <CreditCard className="w-6 h-6 mr-2" />
                                        )}
                                        Confirm & Pay
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Perks Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <span>Cancel for free up to 24h before</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <span>Secure payment via Stripe</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <span>Instant confirmation</span>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
