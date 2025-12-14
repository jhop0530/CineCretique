import { checkSupabaseActive, getAllSupabaseMovies, saveSupabaseMovie, deleteSupabaseMovie, getSupabaseUser, getAllSupabaseUsers, updateSupabaseUser, saveSupabaseUser, getLandingHeroes, saveLandingHeroes } from './supabase-integration.js';
 
const defaultMovies = [
  { title: "Premiere Movie Example", year: 2025, genre: "Action", desc: "This is the new movie premiering now!", poster: "images/avengers-endgame.jpg", reviews: [], trailerUrl: "https://www.youtube.com/embed/TcMBFSGVi1c", isFeatured: true, origin: "National", isPremiere: true },
  { title: "Avengers: Endgame", year: 2019, genre: "Action", desc: "Heroes assemble for the final stand.", poster: "images/avengers-endgame.jpg", reviews: [], trailerUrl: "https://www.youtube.com/embed/TcMBFSGVi1c", isFeatured: true, origin: "National" },
  { title: "Inception", year: 2010, genre: "Sci-Fi", desc: "Dreams within dreams.", poster: "images/inception.jpg", reviews: [], trailerUrl: "https://www.youtube.com/embed/YoHD9XEInc0", isFeatured: false, origin: "National" }
];
 
// Fallback initialization for LocalStorage ONLY if Supabase is inactive/unconfigured
if (!checkSupabaseActive()) {
  if (!localStorage.getItem('movies')) localStorage.setItem('movies', JSON.stringify(defaultMovies));
  if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify([]));
}

// ========================================================================
// SYNC MOVIES TO SUPABASE ON PAGE LOAD 
// ========================================================================

async function syncLocalMoviesToSupabase() {
  if (!checkSupabaseActive()) return;

  try {
    const localMovies = JSON.parse(localStorage.getItem('movies')) || [];
    if (localMovies.length === 0) return;

    console.log('🔄 Syncing', localMovies.length, 'movies to Supabase...');

    for (const movie of localMovies) {
      // Normalize trailer URL here
      const trailer = normalizeTrailerUrl(movie.trailerUrl ?? movie.trailer_url ?? movie.trailer ?? '');

      const movieForSupabase = {
        title: movie.title,
        year: movie.year,
        genre: movie.genre,
        description: movie.desc,  // Map desc → description
        poster: movie.poster,
        trailerUrl: trailer,
        isFeatured: movie.isFeatured || false,
        origin: movie.origin || 'National',
        isPremiere: movie.isPremiere || false,
        reviews: movie.reviews || []
      };

      await saveSupabaseMovie(movieForSupabase);
    }

    console.log('✅ All movies synced to Supabase!');
  } catch (err) {
    console.error('❌ Sync error:', err);
  }
}

// Call sync on page load
setTimeout(syncLocalMoviesToSupabase, 2000);

const ALL_GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance"];
const BADGE_DEFINITIONS = {
  FIRST_REVIEW: {
    id: "FIRST_REVIEW",
    icon: "✍️",
    title: "First Review",
    desc: "You wrote your first review!"
  },
  ACTION_FAN: {
    id: "ACTION_FAN",
    icon: "💥",
    title: "Action Fan",
    desc: "Reviewed 10 Action movies."
  },
  REVIEW_PRO: {
    id: "REVIEW_PRO",
    icon: "🌟",
    title: "Review Pro",
    desc: "Reviewed 25 movies in total."
  },
  GENRE_EXPLORER: {
    id: "GENRE_EXPLORER",
    icon: "🗺️",
    title: "Genre Explorer",
    desc: "Reviewed a movie in every genre."
  }
  ,
  TRIVIA_MASTER: {
    id: "TRIVIA_MASTER",
    icon: "🧠",
    title: "Trivia Master",
    desc: "Correctly answered a movie trivia question!"
  }
};

const MOVIE_TRIVIA = [
  { q: "What is the highest-grossing film of all time (unadjusted for inflation)?", a: "Avatar (2009)" },
  { q: "Which movie first featured a flushing toilet on screen?", a: "Psycho (1960)" },
  { q: "What was the first feature-length animated movie ever released?", a: "Snow White and the Seven Dwarfs (1937)" },
  { q: "In 'The Matrix', does Neo take the blue pill or the red pill?", a: "The red pill." },
  { q: "What is the name of the fictional street where Harry Potter lives?", a: "Privet Drive." },
  { q: "Which actor played the character of 'Forrest Gump'?", a: "Tom Hanks." },
  { q: "What is the name of the shark in the movie 'Jaws'?", a: "Bruce." },
  { q: "Which film won the first-ever Academy Award for Best Picture?", a: "Wings (1927)" },
  { q: "What is the line that Darth Vader famously says to Luke Skywalker in 'The Empire Strikes Back'?", a: "'No, I am your father.'" },
  { q: "What is Rosebud in 'Citizen Kane'?", a: "His childhood sled." }
];

// NEW helper: normalize any YouTube URL to the embed form (or empty string)
function normalizeTrailerUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  // already embed
  if (s.includes('/embed/')) return s;
  // watch?v=...
  const m1 = s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`;
  // youtu.be/...
  const m2 = s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m2) return `https://www.youtube.com/embed/${m2[1]}`;
  // fallback: return empty to avoid broken iframe
  return '';
}

// NEW helper: escape special chars for safe inline onclick attribute insertion
function escapeAttr(input) {
  if (input === null || input === undefined) return '';
  const s = String(input);
  // escape backslashes and single quotes (we use single-quoted inline handlers),
  // and neutralize angle brackets to avoid accidental HTML.
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let currentUser = localStorage.getItem('currentUser') || null;
let editTarget = null;
let currentPage = 1;
const moviesPerPage = 12;
let currentEditReviewIndex = null;
let badgeQueue = [];
let onConfirmCallback = null;
let currentProfileView = null;

const profileDropdown = document.getElementById('profileDropdown');
const profileDropdownToggle = document.getElementById('profileDropdownToggle');
const profileDropdownMenu = document.getElementById('profileDropdownMenu');
const alertModal = document.getElementById('alertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertOkBtn = document.getElementById('alertOkBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  setTimeout(() => modalEl.classList.add('show'), 10);
}
function closeModal(modalEl) {
  modalEl.classList.add('closing');
  setTimeout(() => {
    modalEl.classList.add('hidden');
    modalEl.classList.remove('show');
    modalEl.classList.remove('closing');
  }, 300);
}
function showAlert(title, message) {
  alertTitle.textContent = title;
  alertMessage.textContent = message;
  openModal(alertModal);
}
alertOkBtn.onclick = () => closeModal(alertModal);
function showConfirm(title, message, callback) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  onConfirmCallback = callback;
  openModal(confirmModal);
}
confirmCancelBtn.onclick = () => closeModal(confirmModal);
confirmOkBtn.onclick = () => {
  if (onConfirmCallback) onConfirmCallback();
  closeModal(confirmModal);
  onConfirmCallback = null;
};

// ========================================================================
// ASYNC DATA LAYER (Supabase / LocalStorage Switch)
// ========================================================================

/**
 * Retrieves all movies - prioritize Supabase, fallback to LocalStorage
 */
async function getMovies() {
  try {
    // Try Supabase first
    if (checkSupabaseActive()) {
      const supabaseMovies = await getAllSupabaseMovies();
      if (supabaseMovies && supabaseMovies.length > 0) {
        console.log('📱 Using movies from Supabase');
        
        const merged = supabaseMovies.map(row => {
          // Ensure trailerUrl is properly set from youtube_url
          return {
            title: row.title ?? '',
            year: row.year ?? 0,
            genre: row.genre ?? '',
            desc: row.desc ?? row.description ?? '',
            poster: row.poster ?? '',
            trailerUrl: row.trailerUrl ?? row.youtube_url ?? row.trailer_url ?? '',
            origin: row.origin ?? 'National',
            isFeatured: !!row.isFeatured,
            isPremiere: !!row.isPremiere,
            reviews: row.reviews ?? []
          };
        });

        localStorage.setItem('movies', JSON.stringify(merged));
        return merged;
      }
    }
 
    // Fallback to LocalStorage
    const stored = localStorage.getItem('movies');
    const movies = stored ? JSON.parse(stored) : [];
    console.log('💾 Using movies from LocalStorage:', movies.length);
    return movies;
  } catch (err) {
    console.error('Error in getMovies():', err);
    return [];
  }
}

/**
 * Saves a movie - save to BOTH Supabase AND LocalStorage
 */
async function saveMovie(movieData) {
  try {
    // 1. Always save to LocalStorage (offline backup) - keep 'desc'
    let movies = JSON.parse(localStorage.getItem('movies')) || [];
    const index = movies.findIndex(m => m.title === movieData.title);

    if (index > -1) {
      movies[index] = movieData;
      console.log('💾 Updated movie in LocalStorage:', movieData.title);
    } else {
      movies.push(movieData);
      console.log('💾 Added movie to LocalStorage:', movieData.title);
    }
    localStorage.setItem('movies', JSON.stringify(movies));

    // 2. ALWAYS sync to Supabase (convert desc → description, ensure trailerUrl is normalized)
    if (checkSupabaseActive()) {
      console.log('📱 Syncing to Supabase:', movieData.title);

      // Normalize trailer URL before sending (ensures embed URL form)
      const trailer = normalizeTrailerUrl(movieData.trailerUrl ?? movieData.trailer_url ?? movieData.trailer ?? movieData.youtubeUrl ?? '');

      const movieForSupabase = {
        title: movieData.title,
        year: movieData.year,
        genre: movieData.genre,
        description: movieData.desc,   // DB column 'description'
        poster: movieData.poster,
        trailerUrl: trailer,           // important: use 'trailerUrl'
        isFeatured: movieData.isFeatured || false,
        isPremiere: movieData.isPremiere || false,
        origin: movieData.origin || 'National',
        reviews: movieData.reviews || []
      };

      const success = await saveSupabaseMovie(movieForSupabase);
      if (success) {
        console.log('✅ Movie synced to Supabase:', movieData.title);
      } else {
        console.error('⚠️ Failed to sync to Supabase, but LocalStorage saved');
      }
    } else {
      console.warn('⚠️ Supabase not active');
    }

    return true;
  } catch (err) {
    console.error('Error in saveMovie():', err);
    return false;
  }
}

/**
 * Deletes a movie - delete from BOTH Supabase AND LocalStorage
 */
async function deleteMovieData(title) {
  try {
    // 1. Always delete from LocalStorage
    let movies = JSON.parse(localStorage.getItem('movies')) || [];
    const updatedMovies = movies.filter(m => m.title !== title);
    localStorage.setItem('movies', JSON.stringify(updatedMovies));
    console.log('💾 Deleted from LocalStorage:', title);

    // 2. Sync deletion to Supabase
    if (checkSupabaseActive()) {
      const success = await deleteSupabaseMovie(title);
      if (success) {
        console.log('📱 Synced deletion to Supabase:', title);
      } else {
        console.warn('⚠️ Supabase sync failed, but LocalStorage deleted');
      }
    }

    return true;
  } catch (err) {
    console.error('Error in deleteMovieData():', err);
    return false;
  }
}

/**
 * Retrieves all users - prioritize Supabase
 */
async function getUsers() {
  try {
    if (checkSupabaseActive()) {
      const supabaseUsers = await getAllSupabaseUsers();
      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log('📱 Using users from Supabase');
        localStorage.setItem('users', JSON.stringify(supabaseUsers));
        return supabaseUsers;
      }
    }

    const stored = localStorage.getItem('users');
    const users = stored ? JSON.parse(stored) : [];
    console.log('💾 Using users from LocalStorage:', users.length);
    return users;
  } catch (err) {
    console.error('Error in getUsers():', err);
    return [];
  }
}

/**
 * Saves a user - save to BOTH Supabase AND LocalStorage
 */
async function saveUser(user) {
  try {
    // 1. Save to LocalStorage
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const index = users.findIndex(u => u.username === user.username);

    if (index > -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem('users', JSON.stringify(users));
    console.log('💾 Saved user to LocalStorage:', user.username);

    // 2. Sync to Supabase
    if (checkSupabaseActive()) {
      const success = await saveSupabaseUser(user);
      if (success) {
        console.log('📱 Synced user to Supabase:', user.username);
      } else {
        console.warn('⚠️ Supabase user sync failed');
      }
    }

    return true;
  } catch (err) {
    console.error('Error in saveUser():', err);
    return false;
  }
}


// ========================================================================
// CORE APPLICATION FUNCTIONS (Updated to be async)
// ========================================================================

async function renderPremiereHero() {
  const heroContainer = document.getElementById('homeHeroSection');
  if (!heroContainer) return;

  // 1) Try central configuration first (Supabase landing_heroes)
  let configs = [];
  try {
    configs = await fetchLandingConfigs();
    if (!Array.isArray(configs)) configs = [];
  } catch (e) {
    console.warn('Error fetching central landing configs:', e);
    configs = [];
  }

  // 2) If central config empty, FALLBACK to featured movies
  if (!configs || configs.length === 0) {
    console.log('⚠️ No central configuration found. Falling back to featured movies.');
    const movies = await getMovies();
    const featured = (movies || []).filter(m => m.isFeatured);
    if (featured.length > 0) {
      configs = featured.map(m => ({
        backgroundUrl: m.poster || '',
        title: m.title || '',
        badge: m.isPremiere ? 'PREMIERE' : '',
        meta: `${m.year || ''} • ${m.genre || ''} • ${m.origin || ''}`,
        description: m.desc || m.description || '',
        language: m.language || '',
        thumbs: [m.poster].filter(Boolean),
        trailerUrl: m.trailerUrl || m.youtubeUrl || ''
      }));
    } else {
      // Final fallback: single legacy/default config
      configs = [getLandingConfig()];
    }
  } else {
    console.log('📱 Using central configuration from Supabase/landing_heroes.');
  }

  // Ensure configs is an array with at least one item
  if (!Array.isArray(configs) || configs.length === 0) configs = [getLandingConfig()];

  // determine active config
  const activeIndex = Math.min(getActiveLandingIndex(), Math.max(0, configs.length - 1));
  setActiveLandingIndex(activeIndex);

  const cfg = configs[activeIndex] || getLandingConfig();
  heroContainer.classList.add('hero-landing');
  heroContainer.classList.remove('premiere-active');

  heroContainer.innerHTML = `
    <div class="hero-bg" style="background-image: url('${escapeAttr(cfg.backgroundUrl)}')"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      ${cfg.badge ? `<div class="hero-badge">${cfg.badge}</div>` : ''}
      <h1>${cfg.title}</h1>
      <div class="hero-meta">${cfg.meta}</div>
      <div class="hero-desc">${cfg.description}</div>
      <div class="hero-actions">
        <button id="heroWatchBtn" class="btn btn-red">Watch now</button>
        <button id="heroMoreBtn" class="btn btn-secondary">More Info</button>
      </div>
    </div>
    <div class="thumb-row">
      ${ (cfg.thumbs||[]).slice(0,6).map(t=>`<img src="${t}" onerror="this.style.display='none'">`).join('') }
    </div>
    <div style="position:absolute; left:30px; bottom:28px; z-index:4; color:#ddd;">${cfg.language ? cfg.language : ''}</div>
    <button id="landingPrevBtn" class="btn btn-secondary" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); z-index:5;">◀</button>
    <button id="landingNextBtn" class="btn btn-secondary" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); z-index:5;">▶</button>
  `;

  // wire buttons
  const watchBtn = document.getElementById('heroWatchBtn');
  const moreBtn = document.getElementById('heroMoreBtn');
  const prevBtn = document.getElementById('landingPrevBtn');
  const nextBtn = document.getElementById('landingNextBtn');
  const activeCfg = cfg;

  if (watchBtn) {
    watchBtn.onclick = () => {
      const url = normalizeTrailerUrl(activeCfg.trailerUrl || activeCfg.youtubeUrl || '');
      if (url) {
        openLandingTrailer(url);
      } else {
        showAlert('No trailer', 'No trailer URL set for this hero.');
      }
    };
    // make the CTA pulse when available
    watchBtn.classList.add('pulse');
  }
  if (moreBtn) {
    moreBtn.onclick = () => openLandingInfo(activeCfg);
  }
  if (prevBtn) prevBtn.onclick = () => { prevLanding(); };
  if (nextBtn) nextBtn.onclick = () => { nextLanding(); };

  // start auto-rotate
  // reveal background and content smoothly
  const bgEl = heroContainer.querySelector('.hero-bg');
  const contentEl = heroContainer.querySelector('.hero-content');
  setTimeout(() => {
    if (bgEl) bgEl.style.opacity = '1';
    if (contentEl) { contentEl.style.opacity = '1'; contentEl.style.transform = 'translateY(0)'; }
  }, 60);

  startLandingRotation();
}

// Landing config helpers
function getLandingConfig() {
  // legacy single config kept for backwards-compatibility
  try {
    const raw = localStorage.getItem('landingConfigs');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr[0];
    }
    const legacy = localStorage.getItem('landingConfig');
    if (legacy) return JSON.parse(legacy);
  } catch (e) { }
  return {
    backgroundUrl: 'https://images.unsplash.com/photo-1512149177596-f817c725f2c7?auto-format&fit=crop&w=1600',
    title: 'Movie reviews & community critiques',
    badge: 'LIMITED CRIME DOCU DRAMA',
    meta: '2025 • Crime • Documentary • 16+ • HD',
    description: 'Discover movies by genre, rate them, and join the discussion.',
    language: 'Filipino',
    thumbs: [],
    trailerUrl: ''
  };
}

function getLandingConfigs() {
  try {
    const raw = localStorage.getItem('landingConfigs');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // fallback to single legacy config
  const single = getLandingConfig();
  return [single];
}

function saveLandingConfigs(arr) {
  localStorage.setItem('landingConfigs', JSON.stringify(arr));
  if (checkSupabaseActive()) {
    // persist centrally
    try { saveLandingHeroes(arr).then(ok=>{ if(!ok) console.warn('Failed to save landing heroes to supabase'); }); } catch(e) { console.warn('saveLandingConfigs supabase error', e); }
  }
}

// Async fetch wrapper: prefer Supabase-stored landing heroes when available
async function fetchLandingConfigs() {
  if (checkSupabaseActive()) {
    try {
      const data = await getLandingHeroes();
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) { console.warn('fetchLandingConfigs supabase read failed', e); }
  }
  return getLandingConfigs();
}

function getActiveLandingIndex() {
  try { const v = parseInt(localStorage.getItem('landingActiveIndex') || '0', 10); return isNaN(v) ? 0 : v; } catch(e) { return 0; }
}

function setActiveLandingIndex(i) { localStorage.setItem('landingActiveIndex', String(i)); }

function saveLandingConfig(cfg) {
  localStorage.setItem('landingConfig', JSON.stringify(cfg));
}

// Admin landing editor
const editLandingBtn = document.getElementById('editLandingBtn');
const landingEditorPanel = document.getElementById('landingEditorPanel');
if (editLandingBtn) editLandingBtn.onclick = openLandingEditor;
if (document.getElementById('closeLandingEditor')) document.getElementById('closeLandingEditor').onclick = () => { closeModal(landingEditorPanel); startLandingRotation(); };
if (document.getElementById('saveLandingBtn')) document.getElementById('saveLandingBtn').onclick = async () => {
  const select = document.getElementById('landingSelect');
  const idx = select ? parseInt(select.value,10) : 0;
  const bg = document.getElementById('landingBgUrl').value.trim();
  const title = document.getElementById('landingTitle').value.trim();
  const badge = document.getElementById('landingBadge').value.trim();
  const meta = document.getElementById('landingMeta').value.trim();
  const trailer = document.getElementById('landingTrailerUrl').value.trim();
  const desc = document.getElementById('landingDescription').value.trim();
  const lang = document.getElementById('landingLanguage').value.trim();
  const thumbsRaw = document.getElementById('landingThumbs').value.trim();
  const thumbs = thumbsRaw ? thumbsRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const configs = await fetchLandingConfigs();
  const newItem = { backgroundUrl: bg, title, badge, meta, trailerUrl: trailer, description: desc, language: lang, thumbs };
  if (!title) return showAlert('Error','Please enter a title for the hero.');
  if (isNaN(idx) || idx < 0 || idx >= configs.length) {
    // add new
    configs.push(newItem);
    await saveLandingConfigs(configs);
    setActiveLandingIndex(configs.length-1);
  } else {
    // update selected
    configs[idx] = newItem;
    await saveLandingConfigs(configs);
    setActiveLandingIndex(idx);
  }
  closeModal(landingEditorPanel);
  await renderPremiereHero();
};

async function openLandingEditor() {
  stopLandingRotation();
  const cfg = getLandingConfig();
  const configs = await fetchLandingConfigs();
  const select = document.getElementById('landingSelect');
  select.innerHTML = '';
  configs.forEach((c, i) => {
    const opt = document.createElement('option'); opt.value = String(i); opt.textContent = c.title || `Hero ${i+1}`; select.appendChild(opt);
  });
  const active = Math.min(getActiveLandingIndex(), configs.length-1);
  select.value = String(active);
  const cur = configs[active] || cfg;
  document.getElementById('landingBgUrl').value = cur.backgroundUrl || '';
  document.getElementById('landingTitle').value = cur.title || '';
  document.getElementById('landingBadge').value = cur.badge || '';
  document.getElementById('landingMeta').value = cur.meta || '';
  document.getElementById('landingTrailerUrl').value = cur.trailerUrl || cur.youtubeUrl || '';
  document.getElementById('landingDescription').value = cur.description || '';
  document.getElementById('landingLanguage').value = cur.language || '';
  document.getElementById('landingThumbs').value = (cur.thumbs || []).join(', ');
  document.getElementById('deleteHeroBtn').disabled = configs.length === 0;
  openModal(landingEditorPanel);
}

// Add hero button
if (document.getElementById('addHeroBtn')) document.getElementById('addHeroBtn').onclick = () => {
  (async () => {
    const configs = await fetchLandingConfigs();
    const blank = { backgroundUrl: '', title: 'New Hero', badge: '', meta: '', trailerUrl: '', description: '', language: '', thumbs: [] };
    configs.push(blank);
    await saveLandingConfigs(configs);
    openLandingEditor();
  })();
};

// Delete hero
if (document.getElementById('deleteHeroBtn')) document.getElementById('deleteHeroBtn').onclick = async () => {
  const select = document.getElementById('landingSelect');
  if (!select) return;
  const idx = parseInt(select.value,10);
  const configs = await fetchLandingConfigs();
  if (configs.length === 0) return;
  showConfirm('Delete Hero','Are you sure you want to delete this landing hero?', async () => {
    configs.splice(idx,1);
    await saveLandingConfigs(configs);
    setActiveLandingIndex(Math.max(0, idx-1));
    closeModal(landingEditorPanel);
    await renderPremiereHero();
  });
};

// change selected hero in editor
const landingSelectEl = document.getElementById('landingSelect');
if (landingSelectEl) landingSelectEl.onchange = async () => {
  const configs = await fetchLandingConfigs();
  const idx = parseInt(landingSelectEl.value,10);
  const cur = configs[idx] || getLandingConfig();
  document.getElementById('landingBgUrl').value = cur.backgroundUrl || '';
  document.getElementById('landingTitle').value = cur.title || '';
  document.getElementById('landingBadge').value = cur.badge || '';
  document.getElementById('landingMeta').value = cur.meta || '';
  document.getElementById('landingTrailerUrl').value = cur.trailerUrl || '';
  document.getElementById('landingDescription').value = cur.description || '';
  document.getElementById('landingLanguage').value = cur.language || '';
  document.getElementById('landingThumbs').value = (cur.thumbs || []).join(', ');
};

// Prev / Next landing
async function prevLanding() {
  // Determine length based on central configs first, then featured movies, then default
  let configs = await fetchLandingConfigs();
  if (!Array.isArray(configs) || configs.length === 0) {
    const movies = await getMovies();
    const featured = (movies || []).filter(m => m.isFeatured);
    if (featured.length > 0) configs = featured;
    else configs = [getLandingConfig()];
  }
  const configsLen = Math.max(1, configs.length);
  let idx = getActiveLandingIndex();
  idx = (idx - 1 + configsLen) % configsLen;
  setActiveLandingIndex(idx);
  await renderPremiereHero();
}
async function nextLanding() {
  // Determine length based on central configs first, then featured movies, then default
  let configs = await fetchLandingConfigs();
  if (!Array.isArray(configs) || configs.length === 0) {
    const movies = await getMovies();
    const featured = (movies || []).filter(m => m.isFeatured);
    if (featured.length > 0) configs = featured;
    else configs = [getLandingConfig()];
  }
  const configsLen = Math.max(1, configs.length);
  let idx = getActiveLandingIndex();
  idx = (idx + 1) % configsLen;
  setActiveLandingIndex(idx);
  await renderPremiereHero();
}

// Landing info modal
const landingInfoModal = document.getElementById('landingInfoModal');
if (landingInfoModal) {
  document.getElementById('closeLandingInfo').onclick = () => { closeModal(landingInfoModal); startLandingRotation(); };
  document.getElementById('landingInfoCloseBtn').onclick = () => { closeModal(landingInfoModal); startLandingRotation(); };
  document.getElementById('landingInfoWatchBtn').onclick = () => {
    const cfg = landingInfoModal._cfg;
    if (!cfg) return;
    const url = normalizeTrailerUrl(cfg.trailerUrl || cfg.youtubeUrl || '');
    if (url) {
      openLandingTrailer(url);
    } else showAlert('No trailer','No trailer URL set.');
  };
}

function openLandingInfo(cfg) {
  if (!landingInfoModal) return;
  document.getElementById('landingInfoTitle').textContent = cfg.title || '';
  document.getElementById('landingInfoMeta').textContent = cfg.meta || '';
  const thumbsEl = document.getElementById('landingInfoThumbs');
  thumbsEl.innerHTML = '';
  (cfg.thumbs||[]).slice(0,6).forEach(t => {
    const img = document.createElement('img'); img.src = t; img.style.width='64px'; img.style.height='92px'; img.onerror = () => img.style.display='none'; thumbsEl.appendChild(img);
  });
  document.getElementById('landingInfoDesc').textContent = cfg.description || '';
  landingInfoModal._cfg = cfg;
  openModal(landingInfoModal);
}

// Landing trailer popup
const landingTrailerModal = document.getElementById('landingTrailerModal');
const landingTrailerIframe = document.getElementById('landingTrailerIframe');
if (landingTrailerModal) {
  document.getElementById('closeLandingTrailer').onclick = () => closeLandingTrailer();
}

function openLandingTrailer(embedUrl) {
  if (!landingTrailerModal || !landingTrailerIframe) {
    window.open(embedUrl, '_blank');
    return;
  }
  // ensure embed form and autoplay
  const url = embedUrl.includes('?') ? `${embedUrl}&autoplay=1&mute=1` : `${embedUrl}?autoplay=1&mute=1`;
  landingTrailerIframe.src = url;
  openModal(landingTrailerModal);
  stopLandingRotation();
}

function closeLandingTrailer() {
  if (!landingTrailerModal || !landingTrailerIframe) return;
  landingTrailerIframe.src = '';
  closeModal(landingTrailerModal);
  // resume rotation
  startLandingRotation();
}

// Auto-rotate controls
let landingRotateInterval = null;
function startLandingRotation() {
  stopLandingRotation();
  landingRotateInterval = setInterval(() => { nextLanding(); }, 3500);
}
function stopLandingRotation() {
  if (landingRotateInterval) { clearInterval(landingRotateInterval); landingRotateInterval = null; }
}

async function renderFeaturedMovies() {
  const container = document.getElementById('featuredSection');
  container.innerHTML = "";
}

async function renderRecommendations() {
  const container = document.getElementById('recommendedSection');
  if (!currentUser || currentUser === 'admin') {
    container.classList.add('hidden');
    return;
  }

  const users = await getUsers();
  const movies = await getMovies();
  const user = users.find(u => u.username === currentUser);

  let myReviews = [];
  movies.forEach(movie => {
    if (movie.reviews) {
      movie.reviews.forEach(review => {
        if (review.user === currentUser) {
          myReviews.push({ ...review, genre: movie.genre, movieTitle: movie.title });
        }
      });
    }
  });

  // ... (rest of the function logic remains the same)
  if (myReviews.length === 0) {
    container.classList.add('hidden');
    return;
  }

  myReviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const lastFiveReviews = myReviews.slice(0, 5);
  const favoriteGenres = [...new Set(lastFiveReviews.map(r => r.genre))];

  if (favoriteGenres.length === 0) {
    container.classList.add('hidden');
    return;
  }

  const reviewedTitles = new Set(myReviews.map(r => r.movieTitle));
  const watchlistTitles = new Set(user.watchlist || []);

  const recommendations = movies.filter(movie => {
    return favoriteGenres.includes(movie.genre) &&
      !reviewedTitles.has(movie.title) &&
      !watchlistTitles.has(movie.title);
  });

  if (recommendations.length === 0) {
    container.classList.add('hidden');
    return;
  }

  const topRecommendations = recommendations.slice(0, 6);
  container.classList.remove('hidden');
  container.innerHTML = `
    <h2>Recommended for You</h2>
    <div class="grid">
      ${topRecommendations.map((m, index) => {
    const ratingDisplay = getAverageRating(m);
    return `
        <div class="card" style="animation-delay: ${index * 0.05}s">
          <div class="card-poster-wrapper" onclick="openMovie('${m.title}')">
            <img src="${m.poster}" alt="${m.title}">
            <div class="card-hover-rating">${ratingDisplay}</div>
          </div>
          <div class="card-info" onclick="openMovie('${m.title}')">
            <h4>${m.title}</h4>
            <p>${m.genre} • ${m.year} • ${m.origin || 'N/A'}</p>
          </div>
        </div>
        `
  }).join('')}
    </div>
  `;
}

function getAverageRating(movie) {
  if (!movie.reviews || movie.reviews.length === 0) {
    return '<span class="no-rating">No reviews</span>';
  }
  const totalStars = movie.reviews.reduce((sum, review) => sum + review.stars, 0);
  const average = (totalStars / movie.reviews.length).toFixed(1);
  return `★ ${average}`;
}

async function renderMovies() {
  const grid = document.getElementById('moviesGrid');
  const genre = document.getElementById('genreSelect').value;
  const search = document.getElementById('search').value.toLowerCase();
  const sort = document.getElementById('sortSelect').value;
  const movies = await getMovies();

  const filtered = movies.filter(m =>
    (genre === "all" || m.genre === genre) &&
    (m.title.toLowerCase().includes(search) || m.desc.toLowerCase().includes(search))
  );

  // ... (rest of the function logic remains the same for sorting, filtering, and pagination)
  if (sort === "title_asc") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "year_desc") {
    filtered.sort((a, b) => b.year - a.year);
  } else if (sort === "year_asc") {
    filtered.sort((a, b) => a.year - b.year);
  } else if (sort === "origin_asc") {
    filtered.sort((a, b) => (a.origin || "").localeCompare(b.origin || ""));
  } else if (sort === "origin_desc") {
    filtered.sort((a, b) => (b.origin || "").localeCompare(a.origin || ""));
  }

  const totalMovies = filtered.length;
  const totalPages = Math.ceil(totalMovies / moviesPerPage);
  const startIndex = (currentPage - 1) * moviesPerPage;
  const endIndex = startIndex + moviesPerPage;
  const moviesToRender = filtered.slice(startIndex, endIndex);

  grid.innerHTML = moviesToRender.map((m, index) => {
    const ratingDisplay = getAverageRating(m);

    return `
    <div class="card" style="animation-delay: ${index * 0.05}s">
      ${currentUser === "admin" ? `
        <button class="edit-btn" onclick="openEditPanel('${m.title}')">✎</button>
        <button class="delete-btn" onclick="deleteMovie('${m.title}')">✕</button>
      ` : ''}
      
      <div class="card-poster-wrapper" onclick="openMovie('${m.title}')">
        <img src="${m.poster}" alt="${m.title}">
        
        <div class="card-hover-rating">
          ${ratingDisplay}
        </div>
      </div>

      <div class="card-info" onclick="openMovie('${m.title}')">
        <h4>${m.title}</h4>
        <p>${m.genre} • ${m.year} • ${m.origin || 'N/A'}</p>
      </div>

    </div>
  `}).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById('paginationContainer');
  container.innerHTML = "";
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    container.innerHTML += `
      <button 
        class="page-btn ${i === currentPage ? 'active' : ''}" 
        onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }
}

function changePage(page) {
  currentPage = page;
  renderMovies();
  document.querySelector('.controls').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('genreSelect').onchange = () => {
  currentPage = 1;
  renderMovies();
};
document.getElementById('sortSelect').onchange = () => {
  currentPage = 1;
  renderMovies();
};
document.getElementById('search').oninput = () => {
  currentPage = 1;
  renderMovies();
};

async function openMovie(title) {
  const movies = await getMovies();
  const m = movies.find(x => x.title === title);
  if (!m) return;
  if (!m.reviews) m.reviews = [];

  const movieModal = document.getElementById('movieModal');
  const premiereModalLayout = document.getElementById('premiereModalLayout');
  const normalModalLayout = document.getElementById('normalModalLayout');
  const normalBookmarkBtn = document.getElementById('normalBookmarkBtn');
  const premiereBookmarkBtn = document.getElementById('premiereBookmarkBtn');

  if (currentUser && currentUser !== "admin") {
    normalBookmarkBtn.classList.remove('hidden');
    premiereBookmarkBtn.classList.remove('hidden');

    // Uses getUsers() now
    let users = await getUsers();
    let user = users.find(u => u.username === currentUser);
    if (!user.watchlist) user.watchlist = [];

    const isBookmarked = user.watchlist.includes(m.title);
    updateBookmarkButton(normalBookmarkBtn, isBookmarked);
    updateBookmarkButton(premiereBookmarkBtn, isBookmarked);

    normalBookmarkBtn.onclick = () => toggleWatchlist(m.title);
    premiereBookmarkBtn.onclick = () => toggleWatchlist(m.title);

  } else {
    normalBookmarkBtn.classList.add('hidden');
    premiereBookmarkBtn.classList.add('hidden');
  }

  currentEditReviewIndex = null;
  const premiereStars = document.querySelectorAll('input[name="ratingPremiere"]');
  premiereStars.forEach(star => star.checked = false);
  const normalStars = document.querySelectorAll('input[name="ratingNormal"]');
  normalStars.forEach(star => star.checked = false);
  document.getElementById('reviewCommentPremiere').value = "";
  document.getElementById('reviewCommentNormal').value = "";
  document.getElementById('submitReviewBtnPremiere').textContent = "Submit";
  document.getElementById('submitReviewBtnNormal').textContent = "Submit";


  if (m.isPremiere) {
    movieModal.classList.add('premiere-modal');
    premiereModalLayout.classList.remove('hidden');
    normalModalLayout.classList.add('hidden');
    document.getElementById('premiereTitle').textContent = m.title;
    document.getElementById('premiereMeta').textContent = `${m.genre} • ${m.year} • ${m.origin || 'N/A'}`;

    const modalTrailer = document.getElementById('premiereTrailer');
    if (m.trailerUrl) {
      const autoplayUrl = m.trailerUrl.includes('?') ? `${m.trailerUrl}&autoplay=1&mute=1` : `${m.trailerUrl}?autoplay=1&mute=1`;
      modalTrailer.src = autoplayUrl;
    } else {
      modalTrailer.src = "";
    }

    renderReviews(m, 'premiere');
    document.getElementById('submitReviewBtnPremiere').onclick = () => saveReview(title, 'premiere');

  } else {
    movieModal.classList.remove('premiere-modal');
    premiereModalLayout.classList.add('hidden');
    normalModalLayout.classList.remove('hidden');
    document.getElementById('modalTitleNormal').textContent = m.title;
    document.getElementById('modalMetaNormal').textContent = `${m.genre} • ${m.year} • ${m.origin || 'N/A'}`;
    document.getElementById('modalDesc').textContent = m.desc;
    const modalPoster = document.getElementById('modalPoster');
    const modalTrailer = document.getElementById('modalTrailer');
    const trailerContainer = document.getElementById('trailerContainer');

    if (m.trailerUrl) {
      const autoplayUrl = m.trailerUrl.includes('?') ? `${m.trailerUrl}&autoplay=1&mute=1` : `${m.trailerUrl}?autoplay=1&mute=1`;
      modalTrailer.src = autoplayUrl;
      trailerContainer.classList.remove('hidden');
      modalPoster.style.display = 'none';
    } else {
      modalTrailer.src = "";
      trailerContainer.classList.add('hidden');
      modalPoster.src = m.poster;
      modalPoster.style.display = 'block';
    }

    renderReviews(m, 'normal');
    document.getElementById('submitReviewBtnNormal').onclick = () => saveReview(title, 'normal');
  }

  openModal(movieModal);
}

function updateBookmarkButton(btn, isBookmarked) {
  if (isBookmarked) {
    btn.innerHTML = '<i class="bi bi-bookmark-fill"></i>';
    btn.title = "Remove from Watchlist";
    btn.classList.add('bookmarked');
  } else {
    btn.innerHTML = '<i class="bi bi-bookmark-plus"></i>';
    btn.title = "Add to Watchlist";
    btn.classList.remove('bookmarked');
  }
}

async function toggleWatchlist(title) {
  if (!currentUser || currentUser === "admin") return;

  let users = await getUsers(); // Use async wrapper
  const userIndex = users.findIndex(u => u.username === currentUser);
  if (userIndex === -1) return;

  let user = users[userIndex];
  if (!user.watchlist) user.watchlist = [];

  const normalBookmarkBtn = document.getElementById('normalBookmarkBtn');
  const premiereBookmarkBtn = document.getElementById('premiereBookmarkBtn');
  const movieIndex = user.watchlist.indexOf(title);

  if (movieIndex > -1) {
    user.watchlist.splice(movieIndex, 1);
    showAlert("Watchlist", `"${title}" removed from your watchlist.`);
    updateBookmarkButton(normalBookmarkBtn, false);
    updateBookmarkButton(premiereBookmarkBtn, false);
  } else {
    user.watchlist.push(title);
    showAlert("Watchlist", `"${title}" added to your watchlist.`);
    updateBookmarkButton(normalBookmarkBtn, true);
    updateBookmarkButton(premiereBookmarkBtn, true);
  }

  users[userIndex] = user;

  // Use async saveUser
  await saveUser(user);

  if (currentProfileView) {
    openProfilePage(currentProfileView);
  }
  await renderRecommendations();
}

document.getElementById('closeModal').onclick = () => {
  const modal = document.getElementById('movieModal');
  closeModal(modal);
  document.getElementById('modalTrailer').src = "";
  document.getElementById('premiereTrailer').src = "";
  modal.classList.remove('premiere-modal');
  processBadgeQueue();
};

async function saveReview(title, mode = 'normal') {
  const ratingEl = document.querySelector(`input[name="${mode === 'premiere' ? 'ratingPremiere' : 'ratingNormal'}"]:checked`);
  const commentEl = document.getElementById(mode === 'premiere' ? 'reviewCommentPremiere' : 'reviewCommentNormal');
  if (!ratingEl) return showAlert("Error", "Please select a star rating.");
  const rating = parseInt(ratingEl.value, 10);
  const comment = commentEl.value.trim();
  const reviewer = currentUser || "Anonymous";
  if (!comment) return showAlert("Error", "Please write a comment.");

  const movies = await getMovies();
  const movieIndex = movies.findIndex(m => m.title === title);

  if (movieIndex > -1) {
    const movie = movies[movieIndex];
    if (!movie.reviews) movie.reviews = [];
    const timestamp = new Date().toISOString();

    if (currentEditReviewIndex === null) {
      movie.reviews.push({ user: reviewer, stars: rating, comment: comment, timestamp: timestamp, likes: [] });
    } else {
      const reviewIndex = currentEditReviewIndex;
      if (movie.reviews[reviewIndex]) {
        movie.reviews[reviewIndex].stars = rating;
        movie.reviews[reviewIndex].comment = comment;
        movie.reviews[reviewIndex].timestamp = timestamp;
      }
    }

    const saveSuccess = await saveMovie(movie); // Use async saveMovie
    if (!saveSuccess) return showAlert("Error", "Failed to save review to database.");

    checkAndAwardBadges(reviewer);
    currentEditReviewIndex = null;
    ratingEl.checked = false;
    commentEl.value = "";
    document.getElementById(mode === 'premiere' ? 'submitReviewBtnPremiere' : 'submitReviewBtnNormal').textContent = "Submit";

    renderReviews(movie, mode);
    await initialRender(); // Re-render everything to show the updated data
  }
}

async function toggleLikeReview(title, reviewIndex, mode) {
  if (!currentUser || currentUser === "admin") {
    showAlert("Error", "You must be logged in to like a review.");
    return;
  }

  let movies = await getMovies();
  const movieIndex = movies.findIndex(m => m.title === title);
  if (movieIndex === -1) return;
  const movie = movies[movieIndex];
  const review = movie.reviews[reviewIndex];
  if (!review) return;
  if (!review.likes) review.likes = [];
  const likeIndex = review.likes.indexOf(currentUser);
  if (likeIndex > -1) {
    review.likes.splice(likeIndex, 1);
  } else {
    review.likes.push(currentUser);
  }

  const saveSuccess = await saveMovie(movie); // Use async saveMovie
  if (saveSuccess) {
    renderReviews(movie, mode);
  } else {
    showAlert("Error", "Failed to update like status.");
  }
}

// renderReviews function does not need to be async, but relies on 'movie' object
async function renderReviews(movie, mode = 'normal') {
  let listEl, averageEl;
  if (mode === 'premiere') {
    listEl = document.getElementById('reviewListPremiere');
    averageEl = null;
  } else {
    listEl = document.getElementById('reviewListNormal');
    averageEl = document.getElementById('averageRating');
  }

  // Calculate Average Rating
  if (averageEl) {
    if (!movie.reviews || movie.reviews.length === 0) {
      averageEl.innerHTML = "<span>No reviews yet.</span>";
    } else {
      const totalStars = movie.reviews.reduce((sum, review) => sum + review.stars, 0);
      const average = (totalStars / movie.reviews.length).toFixed(1);
      averageEl.innerHTML = `
        ${getStarString(average)} 
        <span>${average} out of 5 (${movie.reviews.length} reviews)</span>
      `;
    }
  }

  // Handle empty reviews
  if (!movie.reviews || movie.reviews.length === 0) {
    listEl.innerHTML = (mode === 'premiere')
      ? '<p class="no-messages">No messages yet.</p>'
      : '<p>No reviews yet. Be the first!</p>';
    return;
  }

  // Fetch users to get PFPs
  const users = await getUsers();
  const defaultLogo = 'SOURCE/Image/l1.png';

  // Sort and Map Reviews
  let sortedReviews = [...movie.reviews];
  sortedReviews.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));

  let messagesHTML = sortedReviews.map((review, index) => {
    const originalIndex = movie.reviews.findIndex(r => r.timestamp === review.timestamp && r.user === review.user);
    
    // Find user PFP
    const reviewerUser = users.find(u => u.username === review.user);
    const pfpUrl = (reviewerUser && reviewerUser.pfp) ? reviewerUser.pfp : defaultLogo;

    let adminControls = '';
    let userControls = '';
    
    if (currentUser === "admin" && currentUser !== review.user) {
      adminControls = `<button class="delete-comment-btn" onclick="deleteReview('${movie.title}', ${originalIndex}, '${mode}')">✕</button>`;
    }

    if (currentUser === review.user) {
      userControls = `
        <div class="review-user-controls">
          <button class="review-edit-btn" onclick="openReviewEditor(${originalIndex}, '${mode}')">✎</button>
          <button class="review-delete-btn" onclick="deleteReview('${movie.title}', ${originalIndex}, '${mode}')">✕</button>
        </div>
      `;
    }

    const userDisplay = (review.user === 'admin' || review.user === 'Anonymous')
      ? `<small style="color: ${review.user === 'admin' ? 'var(--netflix-red)' : '#aaa'}; font-weight:bold;">${review.user}</small>`
      : `<small class="review-user-link" onclick="viewUserProfileFromReview('${review.user}')">${review.user}</small>`;

    const likeCount = review.likes?.length || 0;
    const isLiked = currentUser && review.likes?.includes(currentUser);
    const likeButton = `
      <div class="review-like-controls">
        <button class="like-btn ${isLiked ? 'liked' : ''} ${isLiked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}" onclick="toggleLikeReview('${movie.title}', ${originalIndex}, '${mode}')">
          <i class="bi ${isLiked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}"></i>
          <span>${likeCount}</span>
        </button>
      </div>
    `;

    // HTML Structure with PFP
    if (mode === 'premiere') {
      return `
      <div class="premiere-chat-item">
        <img src="${pfpUrl}" class="chat-pfp" onerror="this.src='${defaultLogo}'" onclick="viewUserProfileFromReview('${review.user}')">
        <div class="chat-content">
           ${currentUser === review.user ? userControls : adminControls}
           ${userDisplay}
           <div class="stars">${getStarString(review.stars)}</div>
           <p>${review.comment}</p>
        </div>
        ${likeButton}
      </div>
    `;
    } else {
      return `
      <div class="review-item">
        <img src="${pfpUrl}" class="review-pfp" onerror="this.src='${defaultLogo}'" onclick="viewUserProfileFromReview('${review.user}')">
        ${currentUser === review.user ? userControls : adminControls}
        <div class="review-item-content">
          <div class="stars">${getStarString(review.stars)}</div>
          <p>${review.comment}</p>
          ${userDisplay}
        </div>
        ${likeButton}
      </div>
    `;
    }
  }).join('');

  listEl.innerHTML = messagesHTML;
}

function viewUserProfileFromReview(username) {
  const modal = document.getElementById('movieModal');
  closeModal(modal);
  document.getElementById('modalTrailer').src = "";
  document.getElementById('premiereTrailer').src = "";
  modal.classList.remove('premiere-modal');
  openProfilePage(username);
}

function openReviewEditor(index, mode = 'normal') {
  const title = document.getElementById(mode === 'premiere' ? 'premiereTitle' : 'modalTitleNormal').textContent;
  // This part does not need to be async as it relies on the currently open movie data
  const movies = JSON.parse(localStorage.getItem('movies'));
  const movie = movies.find(m => m.title === title);
  if (!movie) return;
  const review = movie.reviews[index];
  if (!review) return;
  currentEditReviewIndex = index;
  const starId = (mode === 'premiere') ? `star${review.stars}Premiere` : `star${review.stars}Normal`;
  const commentId = (mode === 'premiere') ? 'reviewCommentPremiere' : 'reviewCommentNormal';
  const submitBtnId = (mode === 'premiere') ? 'submitReviewBtnPremiere' : 'submitReviewBtnNormal';
  document.getElementById(starId).checked = true;
  document.getElementById(commentId).value = review.comment;
  document.getElementById(submitBtnId).textContent = "Update Review";
  const formElement = document.querySelector(mode === 'premiere' ? '.premiere-chat-input' : '.review-form-column');
  formElement.scrollIntoView({ behavior: 'smooth' });
}

function getStarString(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += (i <= Math.round(rating)) ? "★" : "☆";
  }
  return stars;
}

function deleteReview(title, index, mode = 'normal') {
  showConfirm("Delete Review?", "Are you sure you want to delete this review? This cannot be undone.", async () => {
    let movies = await getMovies();
    const movieIndex = movies.findIndex(m => m.title === title);

    if (movieIndex > -1) {
      const movie = movies[movieIndex];
      if (movie.reviews[index]) {
        movie.reviews.splice(index, 1);

        const saveSuccess = await saveMovie(movie); // Use async saveMovie
        if (saveSuccess) {
          renderReviews(movie, mode);
          await initialRender(); // Re-render everything to show the updated data
        } else {
          showAlert("Error", "Failed to delete review.");
        }
      }
    }
  });
}

async function checkAndAwardBadges(username) {
  if (!username || username === "Anonymous" || username === "admin") {
    return;
  }

  let users = await getUsers();
  let movies = await getMovies();
  const userIndex = users.findIndex(u => u.username === username);
  if (userIndex === -1) return;
  const user = users[userIndex];
  if (!user.badges) user.badges = [];
  let myReviews = [];
  for (const movie of movies) {
    if (movie.reviews) {
      for (const review of movie.reviews) {
        if (review.user === username) {
          myReviews.push({ ...review, genre: movie.genre });
        }
      }
    }
  }

  const badgesAwarded = [];
  const firstReviewBadge = BADGE_DEFINITIONS.FIRST_REVIEW;
  if (myReviews.length >= 1 && !user.badges.includes(firstReviewBadge.id)) {
    user.badges.push(firstReviewBadge.id);
    badgeQueue.push(firstReviewBadge);
    badgesAwarded.push(firstReviewBadge.title);
  }

  const actionBadge = BADGE_DEFINITIONS.ACTION_FAN;
  const actionReviews = myReviews.filter(r => r.genre === "Action").length;
  if (actionReviews >= 10 && !user.badges.includes(actionBadge.id)) {
    user.badges.push(actionBadge.id);
    badgeQueue.push(actionBadge);
    badgesAwarded.push(actionBadge.title);
  }

  const proBadge = BADGE_DEFINITIONS.REVIEW_PRO;
  if (myReviews.length >= 25 && !user.badges.includes(proBadge.id)) {
    user.badges.push(proBadge.id);
    badgeQueue.push(proBadge);
    badgesAwarded.push(proBadge.title);
  }

  const explorerBadge = BADGE_DEFINITIONS.GENRE_EXPLORER;
  const reviewedGenres = new Set(myReviews.map(r => r.genre));
  if (ALL_GENRES.every(g => reviewedGenres.has(g)) && !user.badges.includes(explorerBadge.id)) {
    user.badges.push(explorerBadge.id);
    badgeQueue.push(explorerBadge);
    badgesAwarded.push(explorerBadge.title);
  }

  if (badgesAwarded.length > 0) {
    users[userIndex] = user;
    await saveUser(user); // Use async saveUser
  }
}

const badgeModal = document.getElementById('badgeModal');
const closeBadgeModalBtn = document.getElementById('closeBadgeModal');
const confirmBadgeBtn = document.getElementById('confirmBadgeBtn');
function displayBadgeModal(badge) {
  document.getElementById('badgeModalIcon').textContent = badge.icon;
  document.getElementById('badgeModalTitle').textContent = badge.title;
  document.getElementById('badgeModalDesc').textContent = badge.desc;
  openModal(badgeModal);
}
function closeBadgeModal() {
  closeModal(badgeModal);
  processBadgeQueue();
}
closeBadgeModalBtn.onclick = closeBadgeModal;
confirmBadgeBtn.onclick = closeBadgeModal;
function processBadgeQueue() {
  const movieModalOpen = document.getElementById('movieModal').classList.contains('show');
  if (badgeQueue.length > 0 && !movieModalOpen) {
    const badge = badgeQueue.shift();
    displayBadgeModal(badge);
  }
}

function deleteMovie(title) {
  showConfirm("Delete Movie?", `Are you sure you want to delete "${title}"? This cannot be undone.`, async () => {

    const success = await deleteMovieData(title); // Use async wrapper
    if (success) {
      currentPage = 1;
      await initialRender();
    } else {
      showAlert("Error", "Failed to delete movie.");
    }
  });
}

function deleteUser(username) {
  showConfirm("Delete User?", `Are you sure you want to delete "${username}"? This will also delete all their reviews.`, async () => {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const updatedUsers = users.filter(u => u.username !== username);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    let movies = await getMovies();
    movies.forEach(movie => {
      if (movie.reviews) {
        movie.reviews = movie.reviews.filter(review => review.user !== username);
      }
    });

    // Save all movies back after removing the user's reviews
    await Promise.all(movies.map(m => saveMovie(m)));

    await renderUserListPage();
    await renderFriendsFeed();
    await renderRecommendations();
    showAlert("Success", `User "${username}" has been deleted.`);
  });
}

const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const authPanel = document.getElementById('authPanel');

document.getElementById('closeAuthSignIn').onclick = () => closeModal(authModal);
document.getElementById('closeAuthSignUp').onclick = () => closeModal(authModal);
const toggleSignUpBtn = document.getElementById('toggleSignUp');
const toggleSignInBtn = document.getElementById('toggleSignIn');
const toggleSignUpMobile = document.getElementById('toggleSignUpMobile');
const toggleSignInMobile = document.getElementById('toggleSignInMobile');

toggleSignUpBtn.onclick = () => {
  authPanel.classList.add('right-panel-active');
};
toggleSignInBtn.onclick = () => {
  authPanel.classList.remove('right-panel-active');
};
toggleSignUpMobile.onclick = () => {
  authPanel.classList.add('right-panel-active');
};
toggleSignInMobile.onclick = () => {
  authPanel.classList.remove('right-panel-active');
};
loginBtn.onclick = () => { showAuth(); };

const signInBtn = document.getElementById('signInBtn');
const authUser = document.getElementById('authUser');
const authPass = document.getElementById('authPass');

signInBtn.onclick = async () => {
  const user = authUser.value.trim();
  const pass = authPass.value.trim();
  if (!user || !pass) return showAlert("Error", "Please fill all fields.");

  // NOTE: This logic still relies on LocalStorage/Supabase direct query (in game.js), not Supabase Auth
  if (user === "admin" && pass === "pass123") {
    currentUser = "admin";
    localStorage.setItem('currentUser', "admin");
    closeModal(authModal);
    await initialRender();
    return;
  }
  const users = await getUsers();
  const valid = users.find(u => u.username === user && u.password === pass);
  if (valid) {
    currentUser = user;
    localStorage.setItem('currentUser', user);
    closeModal(authModal);
    showAlert("Welcome!", `Successfully logged in as ${user}.`);
    await initialRender();
  } else {
    showAlert("Login Failed", "Invalid username or password.");
  }
};

const signUpBtn = document.getElementById('signUpBtn');
const signUpUser = document.getElementById('signUpUser');
const signUpPass = document.getElementById('signUpPass');
const signUpPfp = document.getElementById('signUpPfp');
signUpBtn.onclick = async () => {
  const user = signUpUser.value.trim();
  const pass = signUpPass.value.trim();
  const pfpUrl = signUpPfp.value.trim();
  if (!user || !pass || !pfpUrl) return showAlert("Error", "Please fill all fields.");
  let users = await getUsers();
  if (users.find(u => u.username === user)) return showAlert("Sign Up Failed", "Username already exists!");

  const newUser = {
    username: user,
    password: pass,
    pfp: pfpUrl,
    badges: [],
    watchlist: [],
    following: [],
    notifications: []
  };

  await saveUser(newUser); // Use async saveUser

  showAlert("Success", "Account created successfully! Please log in.");
  authPanel.classList.remove('right-panel-active');
  signUpUser.value = "";
  signUpPass.value = "";
  signUpPfp.value = "";
};

function showAuth() {
  openModal(authModal);
  authUser.value = "";
  authPass.value = "";
  signUpUser.value = "";
  signUpPass.value = "";
  signUpPfp.value = "";
  document.querySelectorAll('.auth-form').forEach(form => form.reset());
  if (authPanel.classList.contains('right-panel-active')) {
    authPanel.classList.remove('right-panel-active');
  }
}

document.getElementById('dropdownLogoutBtn').onclick = () => {
  profileDropdownMenu.classList.add('hidden');
  profileDropdownToggle.classList.remove('open');
  showConfirm("Log Out?", "Are you sure you want to log out?", async () => {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAlert("Success", "You have been logged out.");
    await initialRender();
    navBtns.forEach(b => b.classList.remove('active'));
    profileDropdownToggle.classList.remove('active');
    document.querySelector('.nav-link[data-page="home"]').classList.add('active');
    navigateToPage('home');
  });
};

profileDropdownToggle.onclick = async (e) => {
  e.stopPropagation();
  profileDropdownMenu.classList.toggle('hidden');
  profileDropdownToggle.classList.toggle('open');

  if (currentUser && currentUser !== 'admin') {
    renderNotificationMenu();

    let users = await getUsers();
    let userIndex = users.findIndex(u => u.username === currentUser);
    let user = users[userIndex];
    if (user && user.notifications) {
      user.notifications.forEach(n => n.read = true);
      await saveUser(user); // Use async saveUser
      checkNotifications();
    }
  }
};

document.addEventListener('click', (e) => {
  if (!profileDropdown.classList.contains('hidden') && !profileDropdown.contains(e.target)) {
    profileDropdownMenu.classList.add('hidden');
    profileDropdownToggle.classList.remove('open');
  }
});

async function updateButtons() {
  const addMovieBtn = document.getElementById('addMovieBtn');
  const manageUsersBtn = document.getElementById('manageUsersBtn');
  const editLandingBtnEl = document.getElementById('editLandingBtn');
  const loginBtn = document.getElementById('loginBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const profileDropdownImg = document.getElementById('profileDropdownImg');
  const profileDropdownName = document.getElementById('profileDropdownName');
  const defaultLogo = 'SOURCE/Image/l1.png';

  if (currentUser) {
    loginBtn.classList.add('hidden');
    profileDropdown.classList.remove('hidden');
    profileDropdownName.textContent = currentUser;
    checkNotifications();

    if (currentUser === "admin") {
      addMovieBtn.classList.remove('hidden');
      manageUsersBtn.classList.remove('hidden');
      if (editLandingBtnEl) editLandingBtnEl.classList.remove('hidden');
      profileDropdownImg.src = defaultLogo;
      profileDropdownImg.onerror = () => profileDropdownImg.src = defaultLogo;
    } else {
      addMovieBtn.classList.add('hidden');
      manageUsersBtn.classList.add('hidden');
      if (editLandingBtnEl) editLandingBtnEl.classList.add('hidden');
      const users = await getUsers();
      const user = users.find(u => u.username === currentUser);
      if (user && user.pfp) {
        profileDropdownImg.src = user.pfp;
      } else {
        profileDropdownImg.src = defaultLogo;
      }
      profileDropdownImg.onerror = () => profileDropdownImg.src = defaultLogo;
    }
  } else {
    loginBtn.classList.remove('hidden');
    profileDropdown.classList.add('hidden');
    addMovieBtn.classList.add('hidden');
    manageUsersBtn.classList.add('hidden');
    // FIX: Explicitly hide the Edit Landing button when logged out
    if (editLandingBtnEl) editLandingBtnEl.classList.add('hidden');
  }
}

const adminPanel = document.getElementById('adminPanel');
const adminPanelTitle = document.getElementById('adminPanelTitle');
const saveAdminChangesBtn = document.getElementById('saveAdminChangesBtn');
const addMovieBtn = document.getElementById('addMovieBtn');
const movieTitle = document.getElementById('movieTitle');
const movieYear = document.getElementById('movieYear');
const movieGenre = document.getElementById('movieGenre');
const movieDesc = document.getElementById('movieDesc');
const moviePoster = document.getElementById('moviePoster');
const movieTrailerUrl = document.getElementById('movieTrailerUrl');
const movieOrigin = document.getElementById('movieOrigin');
document.getElementById('closeAdmin').onclick = () => closeModal(adminPanel);
addMovieBtn.onclick = () => {
  editTarget = null;
  adminPanelTitle.textContent = "Add Movie";
  saveAdminChangesBtn.textContent = "Add Movie";
  movieTitle.value = "";
  movieYear.value = "";
  movieGenre.value = "Action";
  movieOrigin.value = "National";
  movieDesc.value = "";
  moviePoster.value = "images/";
  movieTrailerUrl.value = "";
  openModal(adminPanel);
};

function openEditPanel(title) {
  getMovies().then(movies => {
    const movie = movies.find(m => m.title === title);
    if (!movie) return;
    editTarget = movie.title;
    adminPanelTitle.textContent = "Edit Movie";
    saveAdminChangesBtn.textContent = "Save Changes";
    movieTitle.value = movie.title;
    movieYear.value = movie.year;
    movieGenre.value = movie.genre;
    movieOrigin.value = movie.origin || "National";
    movieDesc.value = movie.desc;
    moviePoster.value = movie.poster;
    movieTrailerUrl.value = movie.trailerUrl || "";
    openModal(adminPanel);
  });
}

// NOTE: The previous, buggy convertYouTubeUrl function was removed here.

saveAdminChangesBtn.onclick = async () => {
  const title = movieTitle.value.trim();
  const year = movieYear.value.trim();
  const genre = movieGenre.value;
  const desc = movieDesc.value.trim();
  const poster = moviePoster.value.trim();
  const trailerUrl = normalizeTrailerUrl(movieTrailerUrl.value.trim());
  const origin = movieOrigin.value;
  // Landing / Premiere toggles removed; default to false
  const isFeaturedVal = false;
  const isPremiereVal = false;

  if (!title || !year || !desc || !poster) return showAlert("Error", "Please fill all fields!");

  let movies = await getMovies();

  let movieData = {
    title,
    year: parseInt(year),
    genre,
    desc,
    poster,
    trailerUrl,
    origin,
    isFeatured: !!isFeaturedVal,
    isPremiere: !!isPremiereVal,
    reviews: []
  };

  if (editTarget !== null) {
    const existingMovie = movies.find(m => m.title === editTarget);
    if (existingMovie) {
      movieData.reviews = existingMovie.reviews || [];
    }
    if (editTarget !== title) {
      await deleteMovieData(editTarget);
    }
  }

  const saveSuccess = await saveMovie(movieData);

  if (saveSuccess) {
    showAlert("Success", editTarget === null ? "Movie added successfully!" : "Movie updated successfully!");
    closeModal(adminPanel);
    editTarget = null;
    await initialRender();
  } else {
    showAlert("Error", "Failed to save movie data.");
  }
};

const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const followUserBtn = document.getElementById('followUserBtn');
followUserBtn.onclick = () => toggleFollow(currentProfileView);
async function toggleFollow(usernameToFollow) {
  if (!currentUser || currentUser === "admin" || currentUser === usernameToFollow) return;
  let users = await getUsers();
  const userIndex = users.findIndex(u => u.username === currentUser);
  if (userIndex === -1) return;
  const user = users[userIndex];
  if (!user.following) user.following = [];
  const followingIndex = user.following.indexOf(usernameToFollow);
  if (followingIndex > -1) {
    user.following.splice(followingIndex, 1);
    followUserBtn.textContent = "Follow";
    followUserBtn.classList.remove('btn-secondary');
    followUserBtn.classList.add('btn-red');
  } else {
    user.following.push(usernameToFollow);
    followUserBtn.textContent = "Following";
    followUserBtn.classList.add('btn-secondary');
    followUserBtn.classList.remove('btn-red');
    const followedUserIndex = users.findIndex(u => u.username === usernameToFollow);
    if (followedUserIndex > -1) {
      const followedUser = users[followedUserIndex];
      if (!followedUser.notifications) followedUser.notifications = [];
      followedUser.notifications.push({
        id: Date.now(),
        type: 'follow',
        user: currentUser,
        timestamp: new Date().toISOString(),
        read: false
      });
      users[followedUserIndex] = followedUser;
      await saveUser(followedUser); // Save followed user's notifications
    }
  }

  users[userIndex] = user;
  await saveUser(user); // Save current user's following list
  openProfilePage(usernameToFollow); // Re-render the profile page
  await renderFriendsFeed();
}

editProfileBtn.onclick = async () => {
  if (currentUser === "admin") return;
  const users = await getUsers();
  const user = users.find(u => u.username === currentUser);
  if (!user) return;
  document.getElementById('editPfpUrl').value = user.pfp || "";
  document.getElementById('editNewPass').value = "";
  document.getElementById('editConfirmPass').value = "";
  openModal(editProfileModal);
};

document.getElementById('closeEditProfile').onclick = () => closeModal(editProfileModal);
document.getElementById('saveProfileChangesBtn').onclick = async () => {
  const newPfpUrl = document.getElementById('editPfpUrl').value.trim();
  const newPass = document.getElementById('editNewPass').value;
  const confirmPass = document.getElementById('editConfirmPass').value;
  if (newPass !== confirmPass) {
    return showAlert("Error", "New passwords do not match!");
  }

  let users = await getUsers();
  const userIndex = users.findIndex(u => u.username === currentUser);
  if (userIndex > -1) {
    let user = users[userIndex];
    user.pfp = newPfpUrl;
    if (newPass) {
      user.password = newPass;
      showAlert("Success", "Profile and password updated successfully!");
    } else {
      showAlert("Success", "Profile updated successfully!");
    }

    await saveUser(user); // Use async saveUser

    await updateButtons();
    openProfilePage(currentUser);
    closeModal(editProfileModal);
  }
};

async function openProfilePage(username) {
  if (!username) return;
  navigateToPage('profile');
  currentProfileView = username;
  const profileUsername = document.getElementById('profileUsername');
  const reviewList = document.getElementById('profileReviewList');
  const profilePageImg = document.getElementById('profilePageImg');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const followUserBtn = document.getElementById('followUserBtn');
  const badgeList = document.getElementById('profileBadgeList');
  const badgeHeader = document.getElementById('profileBadgeHeader');
  const profileUserBlurb = document.getElementById('profileUserBlurb');
  const watchlistGrid = document.getElementById('profileWatchlistGrid');
  const watchlistHeader = watchlistGrid.previousElementSibling;

  const users = await getUsers();
  const userToView = users.find(u => u.username === username);
  const defaultLogo = 'SOURCE/Image/l1.png';

  if (!userToView) {
    showAlert("Error", "User not found.");
    navigateToPage('home');
    return;
  }

  // ... (rest of the profile display logic remains the same)
  if (currentUser === userToView.username) {
    editProfileBtn.classList.remove('hidden');
    followUserBtn.classList.add('hidden');
    profileUserBlurb.textContent = "Your activity and reviews.";
  } else {
    editProfileBtn.classList.add('hidden');
    if (currentUser && currentUser !== 'admin' && userToView.username !== 'admin') {
      followUserBtn.classList.remove('hidden');
      const me = users.find(u => u.username === currentUser);
      const isFollowing = me.following && me.following.includes(userToView.username);
      if (isFollowing) {
        followUserBtn.textContent = "Following";
        followUserBtn.classList.add('btn-secondary');
        followUserBtn.classList.remove('btn-red');
      } else {
        followUserBtn.textContent = "Follow";
        followUserBtn.classList.remove('btn-secondary');
        followUserBtn.classList.add('btn-red');
      }
    } else {
      followUserBtn.classList.add('hidden');
    }
    profileUserBlurb.textContent = `See ${userToView.username}'s activity and reviews.`;
  }

  profileUsername.textContent = `${userToView.username}'s Profile`;
  if (userToView.username === "admin") {
    profilePageImg.parentElement.classList.add('hidden');
    badgeHeader.classList.add('hidden');
    badgeList.classList.add('hidden');
    watchlistHeader.classList.add('hidden');
    watchlistGrid.classList.add('hidden');
  } else {

    profilePageImg.parentElement.classList.remove('hidden');
    badgeHeader.classList.remove('hidden');
    badgeList.classList.remove('hidden');
    watchlistHeader.classList.remove('hidden');
    watchlistGrid.classList.remove('hidden');

    if (userToView.pfp) {
      profilePageImg.src = userToView.pfp;
    } else {
      profilePageImg.src = defaultLogo;
    }
    profilePageImg.onerror = () => profilePageImg.src = defaultLogo;

    if (userToView.badges && userToView.badges.length > 0) {
      badgeList.innerHTML = userToView.badges.map(badgeId => {
        const badge = BADGE_DEFINITIONS[badgeId];
        if (!badge) return '';
        return `
          <div class="badge">
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-title">${badge.title}</div>
            <div class="badge-desc">${badge.desc}</div>
          </div>
        `;
      }).join('');
    } else {
      badgeList.innerHTML = `<p>${userToView.username} has not unlocked any badges yet.</p>`;
    }

    const watchlist = (userToView.watchlist) ? userToView.watchlist : [];
    const allMovies = await getMovies();
    const watchlistMovies = allMovies.filter(m => watchlist.includes(m.title)).reverse();
    if (watchlistMovies.length > 0) {
      watchlistGrid.innerHTML = watchlistMovies.map((m, index) => {
        const ratingDisplay = getAverageRating(m);
        return `
        <div class="card" style="animation-delay: ${index * 0.05}s">
          <div class="card-poster-wrapper" onclick="openMovie('${m.title}')">
            <img src="${m.poster}" alt="${m.title}">
            <div class="card-hover-rating">${ratingDisplay}</div>
          </div>
          <div class="card-info" onclick="openMovie('${m.title}')">
            <h4>${m.title}</h4>
            <p>${m.genre} • ${m.year} • ${m.origin || 'N/A'}</p>
          </div>
        </div>
      `}).join('');
    } else {
      watchlistGrid.innerHTML = `<p>${userToView.username} hasn't added any movies to their watchlist yet.</p>`;
    }
  }

  const movies = await getMovies();
  let myReviews = [];
  for (const movie of movies) {
    if (movie.reviews) {
      for (const review of movie.reviews) {
        if (review.user === userToView.username) {
          myReviews.push({ movieTitle: movie.title, review: review });
        }
      }
    }
  }

  if (myReviews.length === 0) {
    reviewList.innerHTML = `<p>${userToView.username} has not written any reviews yet.</p>`;
  } else {
    reviewList.innerHTML = myReviews.map(item => `
      <div class="profile-review-item">
        <h4 class="profile-review-movie-link" onclick="openMovie('${item.movieTitle}')">${item.movieTitle}</h4>
        <div class="stars">${getStarString(item.review.stars)}</div>
        <p>"${item.review.comment}"</p>
      </div>
    `).reverse().join('');
  }
}

async function renderUserListPage() {
  const grid = document.getElementById('userListGrid');
  let users = await getUsers();
  const defaultLogo = 'SOURCE/Image/l1.png';
  const regularUsers = users.filter(u => u.username !== "admin");
  if (regularUsers.length === 0) {
    grid.innerHTML = "<p>No other users have registered yet.</p>";
    return;
  }

  grid.innerHTML = regularUsers.map(user => {
    return `
    <div class="user-card" onclick="openProfilePage('${escapeAttr(user.username)}')">
      <button class="user-delete-btn" onclick="deleteUser('${escapeAttr(user.username)}'); event.stopPropagation();">✕</button>
      <img src="${user.pfp || defaultLogo}" alt="${user.username}" class="user-card-img" onerror="this.src='${defaultLogo}'">
      <h4>${user.username}</h4>
    </div>
  `}).join('');
}

// ========================================================================
// NAVIGATION AND PAGE SWITCHING
// ========================================================================

const homePage = document.getElementById('homePage');
const aboutPage = document.getElementById('aboutPage');
const profilePage = document.getElementById('profilePage');
const userListPage = document.getElementById('userListPage');
const brandLink = document.getElementById('brandLink');

brandLink.onclick = (e) => {
  e.preventDefault();
  navigateToPage('home');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function navigateToPage(page) {
  // 1. Clear active classes from standard nav links
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  // 2. Clear active class from the profile dropdown toggle
  const profileToggleEl = document.getElementById('profileDropdownToggle');
  if (profileToggleEl) profileToggleEl.classList.remove('active');
  // 3. FIX: Explicitly remove active class from Manage Users button (if present)
  const manageBtn = document.getElementById('manageUsersBtn');
  if (manageBtn) manageBtn.classList.remove('active');
  currentProfileView = null;

  homePage.classList.add('hidden');
  aboutPage.classList.add('hidden');
  profilePage.classList.add('hidden');
  userListPage.classList.add('hidden');

  if (page === "home") {
    document.querySelector('.nav-link[data-page="home"]').classList.add('active');
    homePage.classList.remove('hidden');
  } else if (page === "about") {
    document.querySelector('.nav-link[data-page="about"]').classList.add('active');
    aboutPage.classList.remove('hidden');
  } else if (page === "profile") {
    if (currentUser) {
      document.getElementById('dropdownProfileBtn').classList.add('active');
      document.getElementById('profileDropdownToggle').classList.add('active');
    }
    profilePage.classList.remove('hidden');
  } else if (page === "manage-users") {
    if (manageBtn) manageBtn.classList.add('active');
    renderUserListPage();
    userListPage.classList.remove('hidden');
  }
}

// ========================================================================
// EVENT LISTENERS FOR NAVIGATION
// ========================================================================

const triviaBtn = document.getElementById('triviaBtn');
if (triviaBtn) {
  triviaBtn.onclick = () => {
    showDailyTrivia();
    triviaBtn.textContent = "Show Today's Trivia";
  };
}

// Home and About navigation
document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const page = btn.dataset.page;
    if (!profileDropdownMenu.classList.contains('hidden')) {
      profileDropdownMenu.classList.add('hidden');
      profileDropdownToggle.classList.remove('open');
    }

    if (page === 'profile') {
      if (currentUser) {
        openProfilePage(currentUser);
      } else {
        showAuth();
      }
    } else {
      navigateToPage(page);
    }
  });
});

// Manage Users button
document.getElementById('manageUsersBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  if (!profileDropdownMenu.classList.contains('hidden')) {
    profileDropdownMenu.classList.add('hidden');
    profileDropdownToggle.classList.remove('open');
  }
  navigateToPage('manage-users');
});

// Profile dropdown button
document.getElementById('dropdownProfileBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  if (!profileDropdownMenu.classList.contains('hidden')) {
    profileDropdownMenu.classList.add('hidden');
    profileDropdownToggle.classList.remove('open');
  }
  if (currentUser) {
    openProfilePage(currentUser);
  }
});

// ========================================================================
// FEED TABS
// ========================================================================

const allFeedTab = document.getElementById('allFeedTab');
const friendsFeedTab = document.getElementById('friendsFeedTab');
const allFeedContent = document.getElementById('allFeedContent');
const friendsFeedContent = document.getElementById('friendsFeedContent');
const searchInput = document.getElementById('search');

allFeedTab.addEventListener('click', () => {
  allFeedTab.classList.add('active');
  friendsFeedTab.classList.remove('active');
  allFeedContent.classList.remove('hidden');
  friendsFeedContent.classList.add('hidden');
  searchInput.placeholder = "Search movies...";
  searchInput.disabled = false;
});

friendsFeedTab.addEventListener('click', () => {
  friendsFeedTab.classList.add('active');
  allFeedTab.classList.remove('active');
  friendsFeedContent.classList.remove('hidden');
  allFeedContent.classList.add('hidden');
  searchInput.placeholder = "Search disabled in Friends Feed";
  searchInput.disabled = true;
  renderFriendsFeed();
});

async function renderFriendsFeed() {
  if (!currentUser) {
    friendsFeedContent.innerHTML = `<p class="feed-login-prompt">Please <a onclick="showAuth()">log in</a> to see your friends' activity.</p>`;
    return;
  }
  if (currentUser === "admin") {
    friendsFeedContent.innerHTML = `<p class="feed-login-prompt">The admin account cannot follow users. Please log in as a regular user.</p>`;
    return;
  }

  let users = await getUsers();
  let movies = await getMovies();
  const me = users.find(u => u.username === currentUser);
  const defaultLogo = 'SOURCE/Image/l1.png';

 
 
  if (!me || !me.following || me.following.length === 0) {
    friendsFeedContent.innerHTML = `<p class="feed-login-prompt">You aren't following anyone yet. Visit a user's profile to follow them.</p>`;
    return;
  }

  const followingList = me.following;
  let feedItems = [];

  const followingUsers = {};
  users.forEach(u => {
    if (followingList.includes(u.username)) {
      followingUsers[u.username] = u;
    }
  });

  // Fixed: iterate reviews and push matching items into feedItems
  movies.forEach(movie => {
    if (!movie.reviews) return;
    movie.reviews.forEach(review => {
      if (!review || !review.user) return;
      if (followingList.includes(review.user)) {
        const reviewUser = followingUsers[review.user];
        feedItems.push({
          user: review.user,
          pfp: (reviewUser ? reviewUser.pfp : null) || defaultLogo,
          movieTitle: movie.title,
          moviePoster: movie.poster,
          stars: review.stars,
          comment: review.comment,
          timestamp: new Date(review.timestamp || 0)
        });
      }
    });
  });

  if (feedItems.length === 0) {
    friendsFeedContent.innerHTML = `<p class="feed-login-prompt">Your friends haven't reviewed any movies yet.</p>`;
    return;
  }

  feedItems.sort((a, b) => b.timestamp - a.timestamp);
  friendsFeedContent.innerHTML = feedItems.map(item => {
    return `
    <div class="feed-item">
      <div class="feed-item-header">
        <img src="${item.pfp}" alt="${item.user}" class="feed-user-img" onclick="openProfilePage('${escapeAttr(item.user)}')" onerror="this.src='${defaultLogo}'">
        <div>
          <strong class="feed-user-link" onclick="openProfilePage('${escapeAttr(item.user)}')">${item.user}</strong> reviewed
          <strong class="feed-movie-link" onclick="openMovie('${escapeAttr(item.movieTitle)}')">${item.movieTitle}</strong>
          <span class="feed-timestamp">${item.timestamp.toLocaleString()}</span>
        </div>
      </div>
      <div class="feed-item-body">
        <img src="${item.moviePoster}" alt="${item.movieTitle}" class="feed-movie-poster" onclick="openMovie('${escapeAttr(item.movieTitle)}')">
        <div class="feed-review-content">
          <div class="stars">${getStarString(item.stars)}</div>
          <p>"${item.comment}"</p>
        </div>
      </div>
    </div>
  `}).join('');
}

// ========================================================================
// NOTIFICATIONS
// ========================================================================

function checkNotifications() {
  const indicator = document.getElementById('notificationIndicator');
  if (!currentUser || currentUser === 'admin') {
    indicator.classList.add('hidden');
    return;
  }

  getUsers().then(users => {
    const user = users.find(u => u.username === currentUser);

    if (user && user.notifications && user.notifications.some(n => !n.read)) {
      indicator.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
    }
  });
}

function renderNotificationMenu() {
  const list = document.getElementById('notificationList');
  if (!currentUser || currentUser === 'admin') {
    list.innerHTML = '';
    return;
  }

  getUsers().then(users => {
    const user = users.find(u => u.username === currentUser);

    if (!user || !user.notifications || user.notifications.length === 0) {
      list.innerHTML = '<div class="dropdown-notification-empty">No new notifications.</div>';
      return;
    }

    let notifications = [...user.notifications].reverse();

    list.innerHTML = notifications.map(n => {
      if (n.type === 'follow') {
        return `
          <div class="dropdown-notification ${n.read ? 'read' : 'unread'}" onclick="openProfilePage('${n.user}')">
            <strong>${n.user}</strong> started following you.
          </div>
        `;
      }
      return '';
    }).join('');
  });
}

// ========================================================================
// TRIVIA FUNCTIONALITY
// ========================================================================

let currentTriviaAnswer = ""; // stored answer for current question

function showDailyTrivia() {
  const triviaDisplay = document.getElementById('triviaDisplay');
  const triviaQuestion = document.getElementById('triviaQuestion');
  const triviaInput = document.getElementById('triviaAnswerInput');
  const triviaFeedback = document.getElementById('triviaFeedback');
  const submitBtn = document.getElementById('submitTriviaBtn');
  const giveUpBtn = document.getElementById('giveUpBtn');

  if (!triviaDisplay || !triviaQuestion || !triviaInput || !triviaFeedback || !submitBtn || !giveUpBtn) return;

  // Reset UI
  triviaDisplay.classList.remove('hidden');
  triviaInput.value = "";
  triviaInput.disabled = false;
  triviaFeedback.textContent = "";
  triviaFeedback.className = "";
  submitBtn.disabled = false;

  // Get random question
  const randomIndex = Math.floor(Math.random() * MOVIE_TRIVIA.length);
  const trivia = MOVIE_TRIVIA[randomIndex];
  triviaQuestion.textContent = trivia.q;
  currentTriviaAnswer = trivia.a;

  // Submit handler
  submitBtn.onclick = async () => {
    const userAnswer = (triviaInput.value || "").trim().toLowerCase();
    const correctAnswer = (currentTriviaAnswer || "").toLowerCase();

    if (!userAnswer) return;

    if (correctAnswer.includes(userAnswer) || userAnswer.includes(correctAnswer)) {
      // Correct
      triviaFeedback.textContent = `Correct! The answer is "${currentTriviaAnswer}".`;
      triviaFeedback.style.color = "#46d369";
      triviaInput.disabled = true;
      submitBtn.disabled = true;

      // Award badge
      await awardTriviaBadge();
    } else {
      // Incorrect
      triviaFeedback.textContent = "Incorrect, try again!";
      triviaFeedback.style.color = "#e50914";
    }
  };

  // Give up handler
  giveUpBtn.onclick = () => {
    triviaFeedback.textContent = `The correct answer was: "${currentTriviaAnswer}"`;
    triviaFeedback.style.color = "#aaa";
    triviaInput.disabled = true;
    submitBtn.disabled = true;
  };
}

// Helper to award the trivia badge
async function awardTriviaBadge() {
  if (!currentUser || currentUser === 'admin') return;

  const users = await getUsers();
  const userIndex = users.findIndex(u => u.username === currentUser);
  if (userIndex === -1) return;

  const user = users[userIndex];
  if (!user.badges) user.badges = [];

  const triviaBadge = BADGE_DEFINITIONS.TRIVIA_MASTER;
  if (!triviaBadge) return;

  if (!user.badges.includes(triviaBadge.id)) {
    user.badges.push(triviaBadge.id);
    users[userIndex] = user;
    await saveUser(user);
    displayBadgeModal(triviaBadge);
  }
}

// Expose global functions for window scope
window.showDailyTrivia = showDailyTrivia;
window.showAuth = showAuth;
window.toggleWatchlist = toggleWatchlist;
window.toggleLikeReview = toggleLikeReview;

// ========================================================================
// INITIAL RENDER
// ========================================================================

async function initialRender() { 
  await updateButtons();
  await renderPremiereHero();
  await renderFeaturedMovies();
  await renderMovies();
  await renderFriendsFeed();
  await renderRecommendations();
  checkNotifications();
}

initialRender();
document.querySelector('.nav-link[data-page="home"]').classList.add('active');

// Expose functions used by inline onclick attributes (module scope -> global)
window.openMovie = openMovie;
window.openEditPanel = openEditPanel;
window.deleteMovie = deleteMovie;
window.openProfilePage = openProfilePage;
window.openReviewEditor = openReviewEditor;
window.deleteReview = deleteReview;
window.toggleLikeReview = toggleLikeReview;
window.deleteUser = deleteUser;
window.changePage = changePage;
window.viewUserProfileFromReview = viewUserProfileFromReview;

// ========================================================================
// CAROUSEL FUNCTIONALITY (for About Page)
// ========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.carousel-wrapper');
  const cards = document.querySelectorAll('.carousel-card');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  let currentIndex = 0;

  if (!wrapper || cards.length === 0) return; // Exit if elements are missing

  // Auto-rotation timing: certain members display longer
  const longDisplayMembers = new Set(['emily', 'Palapos']);
  const LONG_DELAY = 5000; // 5s for specific members
  const SHORT_DELAY = 2000; // 2s for others
  let autoTimer = null;
  let isHovered = false;

  function updateCarouselClasses() {
    cards.forEach((card, index) => {
      card.classList.remove('active-card', 'prev-card', 'next-card');

      if (index === currentIndex) {
        card.classList.add('active-card');
      } else if (index === (currentIndex - 1 + cards.length) % cards.length) {
        // previous
        card.classList.add('prev-card');
      } else if (index === (currentIndex + 1) % cards.length) {
        // next
        card.classList.add('next-card');
      }
    });
  }

  // Initial setup
  updateCarouselClasses();
  // Auto-rotation scheduler
  function scheduleNext() {
    clearTimeout(autoTimer);
    if (isHovered) return; // don't schedule while hovered
    const currentCard = cards[currentIndex];
    const member = currentCard && currentCard.dataset ? currentCard.dataset.member : '';
    const delay = longDisplayMembers.has(member) ? LONG_DELAY : SHORT_DELAY;
    autoTimer = setTimeout(() => {
      currentIndex = (currentIndex + 1) % cards.length;
      updateCarouselClasses();
      scheduleNext();
    }, delay);
  }

  // Start auto-rotation
  scheduleNext();

  function manualNavigateTo(index) {
    currentIndex = (index + cards.length) % cards.length;
    updateCarouselClasses();
    scheduleNext();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => {
    manualNavigateTo(currentIndex - 1);
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    manualNavigateTo(currentIndex + 1);
  });

  // Allow clicking the side cards to navigate
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      if (idx === (currentIndex + 1) % cards.length) {
        manualNavigateTo(currentIndex + 1);
      } else if (idx === (currentIndex - 1 + cards.length) % cards.length) {
        manualNavigateTo(currentIndex - 1);
      }
    });
  });

  // Pause auto-rotation on hover and resume on leave
  wrapper.addEventListener('mouseenter', () => {
    isHovered = true;
    clearTimeout(autoTimer);
  });
  wrapper.addEventListener('mouseleave', () => {
    isHovered = false;
    scheduleNext();
  });
});