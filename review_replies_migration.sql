-- Add barber_reply and replied_at to reviews table
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS barber_reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policies if necessary (usually they are already covered by owner policies, 
-- but let's ensure barbers can update their own reviews with replies)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Barbers can reply to reviews' AND tablename = 'reviews') THEN
        CREATE POLICY "Barbers can reply to reviews" 
        ON public.reviews 
        FOR UPDATE 
        USING (auth.uid() = barber_id)
        WITH CHECK (auth.uid() = barber_id);
    END IF;
END $$;
