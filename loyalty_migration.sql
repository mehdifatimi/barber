-- 1. Loyalty Points Balance Table
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
    points_balance INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id, barber_id)
);

-- 2. Loyalty Transactions Table (History)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    points_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can view their own loyalty points" 
ON public.loyalty_points FOR SELECT 
USING (auth.uid() = client_id OR auth.uid() = barber_id);

CREATE POLICY "Users can view their own loyalty transactions" 
ON public.loyalty_transactions FOR SELECT 
USING (auth.uid() = client_id OR auth.uid() = barber_id);

-- 5. Trigger Function to Award Points on Completion
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    points_to_award INTEGER;
BEGIN
    -- Award 10 points per completed booking by default
    -- (Can be enhanced to award based on booking.total_price later)
    IF (NEW.status = 'completed' AND OLD.status != 'completed') THEN
        points_to_award := 10;

        -- Upsert points balance
        INSERT INTO public.loyalty_points (client_id, barber_id, points_balance)
        VALUES (NEW.client_id, NEW.barber_id, points_to_award)
        ON CONFLICT (client_id, barber_id)
        DO UPDATE SET 
            points_balance = loyalty_points.points_balance + points_to_award,
            updated_at = now();

        -- Record transaction
        INSERT INTO public.loyalty_transactions (client_id, barber_id, booking_id, points_change, reason)
        VALUES (NEW.client_id, NEW.barber_id, NEW.id, points_to_award, 'Booking completed reward');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger to Bookings Table
DROP TRIGGER IF EXISTS on_booking_completed_loyalty ON public.bookings;
CREATE TRIGGER on_booking_completed_loyalty
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_points();
