-- Migration: Automatic Barber Rating Calculation and Review Count

-- 1. Add columns to barbers table if they don't exist
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- 2. Create or replace the function to calculate and update barber rating & count
CREATE OR REPLACE FUNCTION public.update_barber_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(2,1);
    total_reviews INTEGER;
    target_barber_id UUID;
BEGIN
    -- Determine which barber_id to update
    IF (TG_OP = 'DELETE') THEN
        target_barber_id := OLD.barber_id;
    ELSE
        target_barber_id := NEW.barber_id;
    END IF;

    -- Calculate the average rating and count for this barber
    SELECT 
        COALESCE(AVG(rating), 0.0),
        COUNT(*)
    INTO 
        avg_rating,
        total_reviews
    FROM public.reviews
    WHERE barber_id = target_barber_id;

    -- Update the barbers table
    UPDATE public.barbers
    SET 
        rating = avg_rating,
        reviews_count = total_reviews
    WHERE id = target_barber_id;

    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger to fire after any change to the reviews table
DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_barber_rating();

-- 4. Initial Sync: Update all barbers' ratings and counts based on current reviews
UPDATE public.barbers b
SET 
    rating = (
        SELECT COALESCE(AVG(rating), 0.0)
        FROM public.reviews r
        WHERE r.barber_id = b.id
    ),
    reviews_count = (
        SELECT COUNT(*)
        FROM public.reviews r
        WHERE r.barber_id = b.id
    );
