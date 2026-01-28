-- Migration to restrict reviews to one per barber per client

-- 1. Add unique constraint to reviews table
-- This prevents a client from leaving multiple reviews for the same barber
ALTER TABLE public.reviews 
ADD CONSTRAINT unique_client_barber_review UNIQUE (client_id, barber_id);

-- 2. Verify and Update handle_new_review logic (Optional)
-- The database constraint will now handle the enforcement at the engine level.
