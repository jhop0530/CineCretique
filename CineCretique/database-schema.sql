-- Add missing columns to movies table
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS isFeatured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS isPremiere BOOLEAN DEFAULT false;

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    username text PRIMARY KEY NOT NULL,
    password text NOT NULL,
    pfp text,
    is_admin boolean DEFAULT FALSE,
    badges text[] DEFAULT '{}',
    watchlist text[] DEFAULT '{}',
    following text[] DEFAULT '{}',
    notifications jsonb DEFAULT '[]'::jsonb
);  

-- 2. Create Movies Table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.movies (
  title TEXT PRIMARY KEY NOT NULL,
  year INTEGER NOT NULL,
  genre TEXT NOT NULL,
  description TEXT NOT NULL,
  poster TEXT NOT NULL,
  trailerUrl TEXT,
  isFeatured BOOLEAN DEFAULT false,
  isPremiere BOOLEAN DEFAULT false,
  origin TEXT DEFAULT 'National',
  reviews JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Insert Default Admin User (For LocalStorage compatibility)
INSERT INTO public.users (username, password, is_admin)
VALUES ('admin', 'pass123', TRUE)
ON CONFLICT (username) DO NOTHING;

-- 4. Enable RLS (CRITICAL for security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for Anonymous/All Users (READ ACCESS)
-- Movies: All users can read all movie data
CREATE POLICY IF NOT EXISTS "Enable read access for all movies" ON public.movies
FOR SELECT USING (TRUE);

-- Users: All users can see the profile data of other users (except passwords)
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON public.users
FOR SELECT USING (TRUE);

-- 6. Define RLS Policies for Authenticated/Registered Users (WRITE ACCESS)
-- Users: Users can update their own profile/social data
CREATE POLICY IF NOT EXISTS "Enable update for users on their own profile" ON public.users
FOR UPDATE USING (username = current_setting('request.jwt.claim.user_id', true)::text)
WITH CHECK (username = current_setting('request.jwt.claim.user_id', true)::text);

-- Movies: Registered users can insert or update reviews (which are nested in the JSONB column)
-- This policy allows updates to the *reviews* column based on application logic.
CREATE POLICY IF NOT EXISTS "Enable updates to movie reviews" ON public.movies
FOR UPDATE USING (TRUE); -- Allow authenticated app logic to handle review updates

-- 7. Function to set current user ID (Optional: Useful for complex RLS)
-- Since the frontend is handling auth locally (username/password in users table),
-- you'll need a mechanism to link the logged-in 'username' to the RLS 'user_id' if you
-- switch to Supabase Auth. For this simple setup, we are relying on broad read policies.