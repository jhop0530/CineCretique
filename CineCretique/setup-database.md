# Supabase Database Setup Guide

## 1. Create Tables in Supabase

Go to your Supabase project and create these tables:

### Movies Table
```sql
CREATE TABLE movies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  genre TEXT NOT NULL,
  desc TEXT NOT NULL,
  poster TEXT NOT NULL,
  trailerUrl TEXT,
  isFeatured BOOLEAN DEFAULT false,
  origin TEXT DEFAULT 'National',
  isPremiere BOOLEAN DEFAULT false,
  reviews JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  pfp TEXT,
  badges TEXT[] DEFAULT '{}',
  watchlist TEXT[] DEFAULT '{}',
  following TEXT[] DEFAULT '{}',
  notifications JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 2. Enable Row Level Security (RLS)

For each table:
1. Go to Authentication > Policies
2. Create policy to allow public read/write (for development)

### Movies Table Policy
```sql
CREATE POLICY "Enable read access for all users" ON movies
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON movies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON movies
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON movies
  FOR DELETE USING (true);
```

### Users Table Policy
```sql
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON users
  FOR DELETE USING (true);
```

## 3. API Keys

Your API keys are already set in `supabase-integration.js`:
- **Project URL**: https://cibplewqwfkqwqebxbbf.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## 4. Testing

The app will now:
- Store all movies in the Supabase `movies` table
- Store all users in the Supabase `users` table
- Sync reviews, watchlists, and notifications to the database
