# 🛠️ Supabase Setup Guide for CineCriteque

This guide provides detailed steps to configure your Supabase backend to work with the CineCriteque application.

## Prerequisites

1.  A **Supabase account**.
2.  A new **Supabase project**.

## Step 1: Get Project Credentials

1.  Go to your Supabase project dashboard.
2.  Navigate to **Project Settings** > **API**.
3.  Locate the following values:
    * **Project URL:** (e.g., `https://cibplewqwfkqwqebxbbf.supabase.co`)
    * **Anon Public Key:** (The key labeled `anon public`)

## Step 2: Configure `supabase-config.js`

1.  In your project directory, copy the file `supabase-config.example.js` and rename the copy to `supabase-config.js`.
2.  Edit `supabase-config.js` and replace the placeholder values with your actual credentials from Step 1:

    ```javascript
    const SUPABASE_URL = 'YOUR_PROJECT_URL_HERE'; 
    const SUPABASE_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';
    ```

## Step 3: Run Database Schema SQL

1.  In your Supabase dashboard, navigate to the **SQL Editor** tab.
2.  Open the local file `database-schema.sql` from your project structure.
3.  Copy the entire content of `database-schema.sql` into the Supabase SQL Editor.
4.  Click the **RUN** button. This will create the `users` and `movies` tables, insert the default 'admin' user, and enable Row Level Security (RLS).

    **Note:** Row Level Security (RLS) is enabled by default to secure your data. The provided SQL policies allow **read access** for all data and **update access** for logged-in users to manage their profiles and reviews.

## Step 4: Configure Supabase Authentication (If moving beyond LocalStorage Auth)

The current `game.js` uses simple username/password comparison against the `public.users` table for authentication.

To switch to **secure email/password authentication (recommended)**:
1.  In the Supabase dashboard, go to the **Authentication** tab.
2.  Go to **Settings**.
3.  Under **Sign Up**, ensure "Enable email signups" is checked.
4.  Update your `JS/supabase-integration.js` to use `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()` instead of querying the `public.users` table directly.

## Step 5: Test the Integration

1.  Open `Index.html` in your browser.
2.  Open the console (F12) and check for the message: `"Supabase Client initialized successfully."`
3.  Log in with the local admin account (`admin`/`pass123`) or register a new user using the new Supabase Auth methods (if implemented).