-- Location Tables Migration

-- 1. Cities Table
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Neighborhoods (Cartiers) Table
CREATE TABLE IF NOT EXISTS public.neighborhoods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(city_id, name)
);

-- 3. Update Barbers Table
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id),
ADD COLUMN IF NOT EXISTS neighborhood_id UUID REFERENCES public.neighborhoods(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add updated_at trigger for barbers
DROP TRIGGER IF EXISTS on_barbers_updated ON public.barbers;
CREATE TRIGGER on_barbers_updated
    BEFORE UPDATE ON public.barbers
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 4. Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

-- 5. Public Access Policies
DROP POLICY IF EXISTS "Cities are viewable by everyone" ON public.cities;
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Neighborhoods are viewable by everyone" ON public.neighborhoods;
CREATE POLICY "Neighborhoods are viewable by everyone" ON public.neighborhoods FOR SELECT USING (true);

-- 6. Seed Basic Data (Morocco)
DO $$ 
DECLARE 
    casa_id UUID;
    rabat_id UUID;
    marrakech_id UUID;
BEGIN
    -- Insert Cities
    INSERT INTO public.cities (name) VALUES ('Casablanca') ON CONFLICT (name) DO NOTHING;
    INSERT INTO public.cities (name) VALUES ('Rabat') ON CONFLICT (name) DO NOTHING;
    INSERT INTO public.cities (name) VALUES ('Marrakech') ON CONFLICT (name) DO NOTHING;

    -- Get IDs
    SELECT id INTO casa_id FROM public.cities WHERE name = 'Casablanca';
    SELECT id INTO rabat_id FROM public.cities WHERE name = 'Rabat';
    SELECT id INTO marrakech_id FROM public.cities WHERE name = 'Marrakech';

    -- Insert Neighborhoods for Casablanca
    INSERT INTO public.neighborhoods (city_id, name) VALUES (casa_id, 'Maarif') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (casa_id, 'Sidi Maarouf') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (casa_id, 'Anfa') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (casa_id, 'Ain Diab') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (casa_id, 'Hay Hassani') ON CONFLICT DO NOTHING;

    -- Insert Neighborhoods for Rabat
    INSERT INTO public.neighborhoods (city_id, name) VALUES (rabat_id, 'Agdal') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (rabat_id, 'Hay Riad') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (rabat_id, 'Souissi') ON CONFLICT DO NOTHING;

    -- Insert Neighborhoods for Marrakech
    INSERT INTO public.neighborhoods (city_id, name) VALUES (marrakech_id, 'Gueliz') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (marrakech_id, 'Hivernage') ON CONFLICT DO NOTHING;
    INSERT INTO public.neighborhoods (city_id, name) VALUES (marrakech_id, 'Medina') ON CONFLICT DO NOTHING;
END $$;

-- 7. Update handle_new_user to include location metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
        COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    );
    
    IF (NEW.raw_user_meta_data->>'role' = 'barber') THEN
        INSERT INTO public.barbers (id, address, bio, city_id, neighborhood_id) 
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'address', ''),
            COALESCE(NEW.raw_user_meta_data->>'bio', ''),
            (NULLIF(NEW.raw_user_meta_data->>'city_id', ''))::UUID,
            (NULLIF(NEW.raw_user_meta_data->>'neighborhood_id', ''))::UUID
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
