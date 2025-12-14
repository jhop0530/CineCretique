let supabase = null;
let isSupabaseReady = false; 

// Wait for Supabase library to load
function initSupabase() {
  if (window.supabase) { 
    try {
      // NOTE: Using the keys from supabase-config.js/SUPABASE_SETUP.md for consistency
      const SUPABASE_URL = 'https://cibplewqwfkqwqebxbbf.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYnBsZXdxd2ZrcXdxZWJ4YmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzc4MDMsImV4cCI6MjA4MDkxMzgwM30.pWLRecG9J0rETjhmF0LQqW2z0Pvby_iFl96AoumVX3g';
      
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      isSupabaseReady = true;
      console.log('✅ Supabase connected successfully!');
    } catch (err) {
      console.error('❌ Supabase init failed:', err);
    }
  } else {
    setTimeout(initSupabase, 100);
  }
}

initSupabase();

export function checkSupabaseActive() {
  return isSupabaseReady && supabase !== null;
}

// Helper: normalize DB row -> app movie object
function mapDbRowToApp(row) {
  if (!row) return null;

  // Accept multiple possible DB column spellings/cases
  const trailer = row.trailerUrl ?? row.trailerurl ?? row.trailer_url ?? row.youtube_url ?? row.youtubeUrl ?? '';

  // Normalize reviews: may be JSONB (array), a JSON string, or empty/NULL
  let reviews = [];
  if (Array.isArray(row.reviews)) {
    reviews = row.reviews;
  } else if (typeof row.reviews === 'string') {
    try { reviews = JSON.parse(row.reviews); } catch (e) { reviews = []; }
  } else if (row.reviews && typeof row.reviews === 'object') {
    reviews = row.reviews;
  } else {
    reviews = [];
  }

  return {
    title: row.title || '',
    year: row.year || 0,
    genre: row.genre || '',
    desc: row.description ?? row.desc ?? '',
    poster: row.poster || '',
    trailerUrl: trailer,
    origin: row.origin || 'National',
    // read booleans from either naming style if present, fallback to false
    isFeatured: !!(row.isFeatured ?? row.is_featured),
    isPremiere: !!(row.isPremiere ?? row.is_premiere),
    reviews: reviews
  };
}

// Helper: build candidate DB payloads (DB-style first, then camelCase, then legacy)
function buildCandidatePayloads(movie) {
  // Primary Payload (Matching database-schema.sql precisely using snake_case)
  const primaryPayload = {
    title: movie.title,
    year: movie.year,
    genre: movie.genre,
    description: movie.desc ?? movie.description ?? '', 
    poster: movie.poster ?? '',
    origin: movie.origin ?? 'National',
    reviews: movie.reviews || [],
    youtube_url: movie.youtubeUrl ?? movie.trailerUrl ?? null,
    is_featured: !!movie.isFeatured,
    is_premiere: !!movie.isPremiere,
    trailer_url: movie.youtubeUrl ?? movie.trailerUrl ?? null,
  };

  // Fallback (for tables that might use camelCase)
  const fallbackCamel = {
    ...primaryPayload,
    youtubeUrl: movie.youtubeUrl ?? movie.trailerUrl ?? null,
    isFeatured: !!movie.isFeatured,
    isPremiere: !!movie.isPremiere,
    trailerUrl: movie.youtubeUrl ?? movie.trailerUrl ?? null,
    is_featured: undefined,
    is_premiere: undefined,
    youtube_url: undefined,
    trailer_url: undefined,
  };

  return [primaryPayload, fallbackCamel];
}

// ========================================================================
// MOVIES
// ========================================================================

export async function getAllSupabaseMovies() {
  if (!checkSupabaseActive()) {
    console.warn('⚠️ Supabase not ready');
    return [];
  }

  try {
    const { data, error } = await supabase.from('movies').select('*');
    if (error) {
      console.error('❌ Error fetching movies:', error.message || error);
      return [];
    }
    // Normalize each row to app format
    const normalized = (data || []).map(mapDbRowToApp);
    console.log('✅ Fetched', normalized.length, 'movies from Supabase');
    return normalized;
  } catch (err) {
    console.error('❌ getAllSupabaseMovies error:', err);
    return [];
  }
}

// Try multiple candidate payload shapes until one succeeds (use upsert)
// Send ONLY safe columns that exist in the live DB to avoid 400 errors.
async function upsertMovieToSupabase(movie) {
	if (!checkSupabaseActive()) return false;

	// Send the DB column names we see in your dashboard:
	// - trailer column in DB is 'trailerurl' (lowercase) according to your screenshot/rows.
	// - avoid sending is_featured / is_premiere if they don't exist in the live table.
	const payload = {
		title: movie.title,
		year: movie.year,
		genre: movie.genre,
		description: movie.desc ?? movie.description ?? '',
		poster: movie.poster ?? '',
		// use lowercase 'trailerurl' key to match the actual DB column
		trailerurl: movie.trailerUrl ?? movie.trailerurl ?? movie.youtubeUrl ?? '',
		origin: movie.origin ?? 'National',
		// ensure reviews is JSON/array
		reviews: Array.isArray(movie.reviews) ? movie.reviews : (movie.reviews ? movie.reviews : [])
	};

	if (!payload.poster || payload.poster === '') {
		console.warn('Supabase upsert skipped: poster missing for', movie.title);
		return false;
	}

	console.log('📤 Sending to Supabase:', {
		title: payload.title,
		trailerurl: payload.trailerurl,
		reviews_count: Array.isArray(payload.reviews) ? payload.reviews.length : 0
	});

	try {
		const { error } = await supabase.from('movies').upsert([payload], { onConflict: 'title' });
		if (error) throw error;
		console.log('✅ Upserted movie in Supabase:', payload.title);
		return true;
	} catch (err) {
		console.error('❌ Supabase upsert failed for movie:', movie.title, err && (err.message || err));
		return false;
	}
}

export async function saveSupabaseMovie(movieData) {
  try {
    const ok = await upsertMovieToSupabase(movieData);
    return ok;
  } catch (err) {
    console.error('❌ saveSupabaseMovie final error:', err);
    return false;
  }
}

export async function deleteSupabaseMovie(title) {
  if (!checkSupabaseActive()) return false;
  try {
    const { error } = await supabase.from('movies').delete().eq('title', title);
    if (error) throw error;
    console.log('✅ Deleted movie from Supabase:', title);
    return true;
  } catch (err) {
    console.error('❌ deleteSupabaseMovie error:', err.message || err);
    return false;
  }
}

// ========================================================================
// USERS
// ========================================================================

export async function getAllSupabaseUsers() {
  if (!checkSupabaseActive()) return [];
  
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ getAllSupabaseUsers error:', err.message || err);
    return [];
  }
}

export async function getSupabaseUser(username) {
  if (!checkSupabaseActive()) return null;
  
  try {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).limit(1);
    if (error) {
      console.error('❌ getSupabaseUser error:', error.message || error);
      return null;
    }
    return (data && data[0]) || null;
  } catch (err) {
    console.error('❌ getSupabaseUser error:', err);
    return null;
  }
}

export async function saveSupabaseUser(userData) {
  if (!checkSupabaseActive()) return false;
  
  try {
    const { data: existing, error: selErr } = await supabase
      .from('users')
      .select('username')
      .eq('username', userData.username)
      .limit(1);

    if (selErr) {
      console.warn('select users error:', selErr.message || selErr);
    }

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('users')
        .update(userData)
        .eq('username', userData.username);
      if (error) {
        console.error('❌ Error updating user:', error);
        return false;
      }
      console.log('✅ Updated user in Supabase:', userData.username);
    } else {
      const { error } = await supabase.from('users').insert([userData]);
      if (error) {
        console.error('❌ Error inserting user:', error);
        return false;
      }
      console.log('✅ Inserted user in Supabase:', userData.username);
    }
    return true;
  } catch (err) {
    console.error('❌ saveSupabaseUser error:', err);
    return false;
  }
}

export async function updateSupabaseUser(username, updates) {
  if (!checkSupabaseActive()) return false;
  try {
    const { error } = await supabase.from('users').update(updates).eq('username', username);
    if (error) {
      console.error('❌ updateSupabaseUser error:', error);
      return false;
    }
    console.log('✅ Updated user fields in Supabase:', username);
    return true;
  } catch (err) {
    console.error('❌ updateSupabaseUser exception:', err);
    return false;
  }
}

// ========================================================================
// LANDING HEROES (store admin-configured landing entries centrally)
// ========================================================================
export async function getLandingHeroes() {
  if (!checkSupabaseActive()) return null;
  try {
    // read the single canonical row named 'default'
    const { data, error } = await supabase.from('landing_heroes').select('data').eq('name','default').limit(1);
    if (error) {
      console.warn('❌ getLandingHeroes supabase error:', error.message || error);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data[0].data || null;
  } catch (err) {
    console.error('❌ getLandingHeroes exception:', err);
    return null;
  }
}

export async function saveLandingHeroes(arr) {
  if (!checkSupabaseActive()) return false;
  try {
    // Upsert a single row with name='default' and data JSONB
    const payload = { name: 'default', data: arr };
    const { error } = await supabase.from('landing_heroes').upsert([payload], { onConflict: 'name' });
    if (error) {
      console.error('❌ saveLandingHeroes error:', error.message || error);
      return false;
    }
    console.log('✅ Saved landing heroes to Supabase');
    return true;
  } catch (err) {
    console.error('❌ saveLandingHeroes exception:', err);
    return false;
  }
}