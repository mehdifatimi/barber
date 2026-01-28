-- Create portfolio_stories table
CREATE TABLE IF NOT EXISTS public.portfolio_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
    before_image_url TEXT NOT NULL,
    after_image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.portfolio_stories ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Portfolio stories are viewable by everyone') THEN
        CREATE POLICY "Portfolio stories are viewable by everyone" ON public.portfolio_stories FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Barbers can manage own portfolio stories') THEN
        CREATE POLICY "Barbers can manage own portfolio stories" ON public.portfolio_stories FOR ALL USING (auth.uid() = barber_id);
    END IF;
END $$;
