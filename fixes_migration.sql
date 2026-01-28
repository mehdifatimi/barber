-- Migration: Fix RLS Policies for Reviews and Bookings

-- 1. DROP old restrictive policies if they exist (to be idempotent)
DROP POLICY IF EXISTS "Clients can create reviews for their bookings" ON public.reviews;
DROP POLICY IF EXISTS "Everyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Clients can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Clients can delete their own reviews" ON public.reviews;

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can delete their own bookings" ON public.bookings;

-- 2. REVIEWS Policies
-- Allow everyone to read reviews
CREATE POLICY "Everyone can view reviews" 
ON public.reviews FOR SELECT
USING (true);

-- Allow clients to create reviews for their bookings (Confirmed or Completed)
CREATE POLICY "Clients can create reviews for their bookings" 
ON public.reviews FOR INSERT
WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE bookings.id = booking_id 
        AND bookings.client_id = auth.uid()
        AND (bookings.status = 'completed' OR bookings.status = 'confirmed')
    )
);

-- Allow clients to manage their own reviews
CREATE POLICY "Clients can update their own reviews" 
ON public.reviews FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own reviews" 
ON public.reviews FOR DELETE
USING (auth.uid() = client_id);


-- 3. BOOKINGS Policies
-- Allow users (clients and barbers) to view their own bookings
CREATE POLICY "Users can view their own bookings" 
ON public.bookings FOR SELECT
USING (
    auth.uid() = client_id 
    OR auth.uid() = barber_id
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Allow clients to create bookings
CREATE POLICY "Clients can create bookings" 
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Allow users to update their own bookings (e.g., status changes)
CREATE POLICY "Users can update their own bookings" 
ON public.bookings FOR UPDATE
USING (
    auth.uid() = client_id 
    OR auth.uid() = barber_id
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Allow clients to cancel (delete) their own bookings
CREATE POLICY "Clients can delete their own bookings" 
ON public.bookings FOR DELETE
USING (auth.uid() = client_id);
