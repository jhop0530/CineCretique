const defaultMovies = [
  { title: "Premiere Movie Example", year: 2025, genre: "Action", desc: "This is the new movie premiering now!", poster: "images/avengers-endgame.jpg", reviews: [], trailerUrl: "https://www.youtube.com/embed/TcMBFSGVi1c", isFeatured: true, origin: "National", isPremiere: true },
  { title: "Avengers: Endgame", year: 2019, genre: "Action", desc: "Heroes assemble for the final stand.", poster: "images/avengers-endgame.jpg", reviews: [], trailerUrl: "https://www.youtube.com/embed/TcMBFSGVi1c", isFeatured: true, origin: "National" },
  { title: "Inception", year: 2010, genre: "Sci-Fi", desc: "Dreams within dreams.", poster: "images/inception.jpg", reviews: [], trailerUrl: "https://www.youtube.com/embed/YoHD9XEInc0", isFeatured: false, origin: "National" }
];

if (!localStorage.getItem('movies')) localStorage.setItem('movies', JSON.stringify(defaultMovies));
if (!localStorage.getItem('users')) localStorage.setItem('users', JSON.stringify([]));

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

function renderPremiereHero() {
  const heroContainer = document.getElementById('homeHeroSection');
  if (!heroContainer) return;

  const movies = JSON.parse(localStorage.getItem('movies')) || [];
  const premiereMovie = movies.find(m => m.isPremiere === true);

  if (!premiereMovie) {
    heroContainer.style.backgroundImage = "linear-gradient(rgba(20, 20, 20, 0.8), rgba(20, 20, 20, 0.8)), url('https://images.unsplash.com/photo-1512149177596-f817c725f2c7?auto-format&fit=crop&w=1200')";
    heroContainer.classList.remove('premiere-active'); 

    heroContainer.innerHTML = `
      <h2>Movie reviews & community critiques</h2>
      <p>Discover movies by genre, rate them, and join the discussion.</p>
    `;
    return;
  }

  heroContainer.style.backgroundImage = `linear-gradient(rgba(20, 20, 20, 0.9), rgba(20, 20, 20, 0.9)), url('${premiereMovie.poster}')`;
  heroContainer.classList.add('premiere-active'); 

  heroContainer.innerHTML = `
    <div class="premiere-badge">
      <span class="live-dot"></span> PREMIERING NOW
    </div>
    <h2>${premiereMovie.title}</h2>
    <p>${premiereMovie.desc}</p>
    <button class="btn btn-red btn-large" onclick="openMovie('${premiereMovie.title}')">
      <i class="bi bi-play-fill"></i> Watch Trailer
    </button>
  `;
}

function renderFeaturedMovies() {
  const container = document.getElementById('featuredSection');
  const movies = JSON.parse(localStorage.getItem('movies')) || [];
  const featured = movies.filter(m => m.isFeatured);

  if (featured.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <h2>Featured</h2>
    <div class="featured-grid">
      ${featured.map(m => `
        <div class="featured-card" onclick="openMovie('${m.title}')">
          <img src="${m.poster}" alt="${m.title}">
          <div class="featured-card-info">
            <h4>${m.title}</h4>
            <p>${m.genre} • ${m.year} • ${m.origin || 'N/A'}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRecommendations() {
  const container = document.getElementById('recommendedSection');
  if (!currentUser || currentUser === 'admin') {
    container.classList.add('hidden');
    return;
  }

  const users = JSON.parse(localStorage.getItem('users'));
  const movies = JSON.parse(localStorage.getItem('movies'));
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

function renderMovies() {
  const grid = document.getElementById('moviesGrid');
  const genre = document.getElementById('genreSelect').value;
  const search = document.getElementById('search').value.toLowerCase();
  const sort = document.getElementById('sortSelect').value;
  const movies = JSON.parse(localStorage.getItem('movies')) || [];

  const filtered = movies.filter(m =>
    (genre === "all" || m.genre === genre) &&
    (m.title.toLowerCase().includes(search) || m.desc.toLowerCase().includes(search))
  );

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

function openMovie(title) {
  const movies = JSON.parse(localStorage.getItem('movies'));
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

    let users = JSON.parse(localStorage.getItem('users'));
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

function toggleWatchlist(title) {
  if (!currentUser || currentUser === "admin") return;

  let users = JSON.parse(localStorage.getItem('users'));
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
  localStorage.setItem('users', JSON.stringify(users));

  if (currentProfileView) {
    openProfilePage(currentProfileView);
  }
  renderRecommendations(); 
}

document.getElementById('closeModal').onclick = () => {
  const modal = document.getElementById('movieModal');
  closeModal(modal);
  document.getElementById('modalTrailer').src = "";
  document.getElementById('premiereTrailer').src = "";
  modal.classList.remove('premiere-modal');
  processBadgeQueue();
};

function saveReview(title, mode = 'normal') {
  const ratingEl = document.querySelector(`input[name="${mode === 'premiere' ? 'ratingPremiere' : 'ratingNormal'}"]:checked`);
  const commentEl = document.getElementById(mode === 'premiere' ? 'reviewCommentPremiere' : 'reviewCommentNormal');
  if (!ratingEl) return showAlert("Error", "Please select a star rating.");
  const rating = parseInt(ratingEl.value, 10);
  const comment = commentEl.value.trim();
  const reviewer = currentUser || "Anonymous";
  if (!comment) return showAlert("Error", "Please write a comment.");
  const movies = JSON.parse(localStorage.getItem('movies'));
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

    localStorage.setItem('movies', JSON.stringify(movies));
    checkAndAwardBadges(reviewer);
    currentEditReviewIndex = null;
    ratingEl.checked = false;
    commentEl.value = "";
    document.getElementById(mode === 'premiere' ? 'submitReviewBtnPremiere' : 'submitReviewBtnNormal').textContent = "Submit";

    renderReviews(movie, mode);
    renderMovies(); 
    renderFriendsFeed(); 
    renderRecommendations();
  }
}

function toggleLikeReview(title, reviewIndex, mode) {
  if (!currentUser || currentUser === "admin") {
    showAlert("Error", "You must be logged in to like a review.");
    return;
  }

  let movies = JSON.parse(localStorage.getItem('movies'));
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

  movies[movieIndex] = movie;
  localStorage.setItem('movies', JSON.stringify(movies));
  renderReviews(movie, mode);
}

function renderReviews(movie, mode = 'normal') {
  let listEl, averageEl;
  if (mode === 'premiere') {
    listEl = document.getElementById('reviewListPremiere');
    averageEl = null; 
  } else {
    listEl = document.getElementById('reviewListNormal');
    averageEl = document.getElementById('averageRating');
  }

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

  if (!movie.reviews || movie.reviews.length === 0) {
    listEl.innerHTML = (mode === 'premiere')
      ? '<p class="no-messages">No messages yet.</p>'
      : '<p>No reviews yet. Be the first!</p>';
    return;
  }

  let sortedReviews = [...movie.reviews];
  sortedReviews.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
  let messagesHTML = sortedReviews.map((review, index) => {
    const originalIndex = movie.reviews.findIndex(r => r.timestamp === review.timestamp && r.user === review.user);
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
      ? `<small style="color: ${review.user === 'admin' ? 'var(--netflix-red)' : '#aaa'};">${review.user}</small>`
      : `<small class="review-user-link" onclick="viewUserProfileFromReview('${review.user}')">${review.user}</small>`;

    const likeCount = review.likes?.length || 0;
    const isLiked = currentUser && review.likes?.includes(currentUser);
    const likeButton = `
      <div class="review-like-controls">
        <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikeReview('${movie.title}', ${originalIndex}, '${mode}')">
          <i class="bi ${isLiked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}"></i>
          <span>${likeCount}</span>
        </button>
      </div>
    `;

    if (mode === 'premiere') {
      return `
      <div class="premiere-chat-item">
        ${currentUser === review.user ? userControls : adminControls}
        ${userDisplay}
        <div class="stars">${getStarString(review.stars)}</div>
        <p>${review.comment}</p>
        ${likeButton}
      </div>
    `;
    } else {
      return `
      <div class="review-item">
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
  showConfirm("Delete Review?", "Are you sure you want to delete this review? This cannot be undone.", () => {
    let movies = JSON.parse(localStorage.getItem('movies'));
    const movieIndex = movies.findIndex(m => m.title === title);

    if (movieIndex > -1) {
      const movie = movies[movieIndex];
      if (movie.reviews[index]) {
        movie.reviews.splice(index, 1);
        localStorage.setItem('movies', JSON.stringify(movies));
        renderReviews(movie, mode); 
        renderMovies(); 
        renderFriendsFeed(); 
        renderRecommendations(); 
      }
    }
  });
}

function checkAndAwardBadges(username) {
  if (!username || username === "Anonymous" || username === "admin") {
    return;
  }

  let users = JSON.parse(localStorage.getItem('users'));
  let movies = JSON.parse(localStorage.getItem('movies'));
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
    localStorage.setItem('users', JSON.stringify(users));
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
  showConfirm("Delete Movie?", `Are you sure you want to delete "${title}"? This cannot be undone.`, () => {
    let movies = JSON.parse(localStorage.getItem('movies'));
    const updatedMovies = movies.filter(m => m.title !== title);
    localStorage.setItem('movies', JSON.stringify(updatedMovies));
    currentPage = 1;
    renderMovies();
    renderFeaturedMovies();
    renderPremiereHero(); 
    renderFriendsFeed(); 
    renderRecommendations(); 
  });
}

function deleteUser(username) {
  showConfirm("Delete User?", `Are you sure you want to delete "${username}"? This will also delete all their reviews.`, () => {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const updatedUsers = users.filter(u => u.username !== username);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    let movies = JSON.parse(localStorage.getItem('movies')) || [];
    movies.forEach(movie => {
      if (movie.reviews) {
        movie.reviews = movie.reviews.filter(review => review.user !== username);
      }
    });
    localStorage.setItem('movies', JSON.stringify(movies));

    renderUserListPage();
    renderFriendsFeed(); 
    renderRecommendations();
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

signInBtn.onclick = () => {
  const user = authUser.value.trim();
  const pass = authPass.value.trim();
  if (!user || !pass) return showAlert("Error", "Please fill all fields.");
  if (user === "admin" && pass === "pass123") {
    currentUser = "admin";
    localStorage.setItem('currentUser', "admin");
    closeModal(authModal);
    updateButtons();
    renderMovies();
    renderFeaturedMovies();
    renderFriendsFeed(); 
    renderRecommendations(); 
    return;
  }
  const users = JSON.parse(localStorage.getItem('users'));
  const valid = users.find(u => u.username === user && u.password === pass);
  if (valid) {
    currentUser = user;
    localStorage.setItem('currentUser', user);
    closeModal(authModal);
    showAlert("Welcome!", `Successfully logged in as ${user}.`);
    updateButtons();
    renderMovies();
    renderFriendsFeed();
    renderRecommendations();
  } else {
    showAlert("Login Failed", "Invalid username or password.");
  }
};

const signUpBtn = document.getElementById('signUpBtn');
const signUpUser = document.getElementById('signUpUser');
const signUpPass = document.getElementById('signUpPass');
const signUpPfp = document.getElementById('signUpPfp');
signUpBtn.onclick = () => {
  const user = signUpUser.value.trim();
  const pass = signUpPass.value.trim();
  const pfpUrl = signUpPfp.value.trim();
  if (!user || !pass || !pfpUrl) return showAlert("Error", "Please fill all fields.");
  let users = JSON.parse(localStorage.getItem('users'));
  if (users.find(u => u.username === user)) return showAlert("Sign Up Failed", "Username already exists!");

  users.push({
    username: user,
    password: pass,
    pfp: pfpUrl,
    badges: [],
    watchlist: [],
    following: [],
    notifications: [] 
  });
  localStorage.setItem('users', JSON.stringify(users));
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
  showConfirm("Log Out?", "Are you sure you want to log out?", () => {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateButtons();
    currentPage = 1;
    renderMovies();
    renderFeaturedMovies();
    renderPremiereHero(); 
    renderFriendsFeed(); 
    renderRecommendations(); 
    checkNotifications(); 
    showAlert("Success", "You have been logged out.");
    navBtns.forEach(b => b.classList.remove('active'));
    profileDropdownToggle.classList.remove('active');
    document.querySelector('.nav-link[data-page="home"]').classList.add('active');
    navigateToPage('home'); 
  });
};

profileDropdownToggle.onclick = (e) => {
  e.stopPropagation(); 
  profileDropdownMenu.classList.toggle('hidden');
  profileDropdownToggle.classList.toggle('open');

  if (currentUser && currentUser !== 'admin') {
    renderNotificationMenu(); 

    let users = JSON.parse(localStorage.getItem('users'));
    let user = users.find(u => u.username === currentUser);
    if (user && user.notifications) {
      user.notifications.forEach(n => n.read = true);
      localStorage.setItem('users', JSON.stringify(users));
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

function updateButtons() {
  const addMovieBtn = document.getElementById('addMovieBtn');
  const manageUsersBtn = document.getElementById('manageUsersBtn');
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
      profileDropdownImg.src = defaultLogo;
      profileDropdownImg.onerror = () => profileDropdownImg.src = defaultLogo;
    } else {
      addMovieBtn.classList.add('hidden');
      manageUsersBtn.classList.add('hidden');
      const users = JSON.parse(localStorage.getItem('users'));
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
const movieIsFeatured = document.getElementById('movieIsFeatured');
const movieOrigin = document.getElementById('movieOrigin');
const movieIsPremiere = document.getElementById('movieIsPremiere');
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
  movieIsFeatured.checked = false;
  movieIsPremiere.checked = false;
  openModal(adminPanel);
};

function openEditPanel(title) {
  const movies = JSON.parse(localStorage.getItem('movies'));
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
  movieIsFeatured.checked = movie.isFeatured || false;
  movieIsPremiere.checked = movie.isPremiere || false;
  openModal(adminPanel);
}

function convertYouTubeUrl(url) {
  if (!url) return "";
  let videoId;
  if (url.includes("watch?v=")) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes("/embed/")) {
    return url;
  } else {
    console.warn("Could not parse YouTube URL:", url);
    return "";
  }
  return `https://www.youtube.com/embed/${videoId}`;
}

saveAdminChangesBtn.onclick = () => {
  const title = movieTitle.value.trim();
  const year = movieYear.value.trim();
  const genre = movieGenre.value;
  const desc = movieDesc.value.trim();
  const poster = moviePoster.value.trim();
  const trailerUrl = convertYouTubeUrl(movieTrailerUrl.value.trim());
  const isFeatured = movieIsFeatured.checked;
  const origin = movieOrigin.value;
  const isPremiere = movieIsPremiere.checked;
  if (!title || !year || !desc || !poster) return showAlert("Error", "Please fill all fields!");
  if (isPremiere && !trailerUrl) {
    return showAlert("Error", "A Premiere movie must have a YouTube Trailer URL.");
  }
  let movies = JSON.parse(localStorage.getItem('movies'));
  if (isPremiere) {
    movies.forEach(m => {
      if (m.title !== editTarget) {
        m.isPremiere = false;
      }
    });
  }
  const movieData = { title, year, genre, desc, poster, trailerUrl, isFeatured, origin, isPremiere, reviews: [] };
  if (editTarget === null) {
    movies.push(movieData);
    showAlert("Success", "Movie added successfully!");
  } else {
    const movieIndex = movies.findIndex(m => m.title === editTarget);
    if (movieIndex > -1) {
      movieData.reviews = movies[movieIndex].reviews || [];
      movies[movieIndex] = movieData;
      showAlert("Success", "Movie updated successfully!");
    }
  }

  localStorage.setItem('movies', JSON.stringify(movies));
  closeModal(adminPanel);
  editTarget = null;
  renderMovies();
  renderFeaturedMovies();
  renderPremiereHero(); 
  renderFriendsFeed(); 
  renderRecommendations(); 
};

const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const followUserBtn = document.getElementById('followUserBtn');
followUserBtn.onclick = () => toggleFollow(currentProfileView);
function toggleFollow(usernameToFollow) {
  if (!currentUser || currentUser === "admin" || currentUser === usernameToFollow) return;
  let users = JSON.parse(localStorage.getItem('users'));
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
    }
  }

  users[userIndex] = user;
  localStorage.setItem('users', JSON.stringify(users));
  renderFriendsFeed(); 
}

editProfileBtn.onclick = () => {
  if (currentUser === "admin") return;
  const users = JSON.parse(localStorage.getItem('users'));
  const user = users.find(u => u.username === currentUser);
  if (!user) return;
  document.getElementById('editPfpUrl').value = user.pfp || "";
  document.getElementById('editNewPass').value = "";
  document.getElementById('editConfirmPass').value = "";
  openModal(editProfileModal);
};

document.getElementById('closeEditProfile').onclick = () => closeModal(editProfileModal);
document.getElementById('saveProfileChangesBtn').onclick = () => {
  const newPfpUrl = document.getElementById('editPfpUrl').value.trim();
  const newPass = document.getElementById('editNewPass').value;
  const confirmPass = document.getElementById('editConfirmPass').value;
  if (newPass !== confirmPass) {
    return showAlert("Error", "New passwords do not match!");
  }

  let users = JSON.parse(localStorage.getItem('users'));
  const userIndex = users.findIndex(u => u.username === currentUser);
  if (userIndex > -1) {
    users[userIndex].pfp = newPfpUrl;
    if (newPass) {
      users[userIndex].password = newPass;
      showAlert("Success", "Profile and password updated successfully!");
    } else {
      showAlert("Success", "Profile updated successfully!");
    }
    localStorage.setItem('users', JSON.stringify(users));

    updateButtons(); 
    openProfilePage(currentUser); 
    closeModal(editProfileModal);
  }
};

function openProfilePage(username) {
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
  const users = JSON.parse(localStorage.getItem('users'));
  const userToView = users.find(u => u.username === username);
  const defaultLogo = 'SOURCE/Image/l1.png';

  if (!userToView) {
    showAlert("Error", "User not found.");
    navigateToPage('home');
    return;
  }

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
    const allMovies = JSON.parse(localStorage.getItem('movies')) || [];
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

  const movies = JSON.parse(localStorage.getItem('movies')) || [];
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

function renderUserListPage() {
  const grid = document.getElementById('userListGrid');
  let users = JSON.parse(localStorage.getItem('users')) || [];
  const defaultLogo = 'SOURCE/Image/l1.png'; 
  const regularUsers = users.filter(u => u.username !== "admin");
  if (regularUsers.length === 0) {
    grid.innerHTML = "<p>No other users have registered yet.</p>";
    return;
  }

  grid.innerHTML = regularUsers.map(user => {
    return `
    <div class="user-card" onclick="openProfilePage('${user.username}')">
      <button class="user-delete-btn" onclick="deleteUser('${user.username}'); event.stopPropagation();">✕</button>
      <img src="${user.pfp || defaultLogo}" alt="${user.username}" class="user-card-img" onerror="this.src='${defaultLogo}'">
      <h4>${user.username}</h4>
    </div>
  `}).join('');
}

function showDailyTrivia() {
  const triviaDisplay = document.getElementById('triviaDisplay');
  const triviaQuestion = document.getElementById('triviaQuestion');
  const triviaAnswer = document.getElementById('triviaAnswer');
  const showAnswerBtn = document.getElementById('showAnswerBtn');
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const triviaIndex = dayOfYear % MOVIE_TRIVIA.length;
  const trivia = MOVIE_TRIVIA[triviaIndex];
  triviaQuestion.textContent = trivia.q;
  triviaAnswer.textContent = `Answer: ${trivia.a}`;
  triviaAnswer.classList.add('hidden');
  showAnswerBtn.classList.remove('hidden');
  triviaDisplay.classList.remove('hidden');
  showAnswerBtn.onclick = () => {
    triviaAnswer.classList.remove('hidden');
    showAnswerBtn.classList.add('hidden');
  };
}

const navBtns = document.querySelectorAll('.nav-link, #manageUsersBtn, #dropdownProfileBtn');
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

const triviaBtn = document.getElementById('triviaBtn');
if (triviaBtn) {
  triviaBtn.onclick = () => {
    showDailyTrivia();
    triviaBtn.textContent = "Show Today's Trivia"; 
  };
}

navBtns.forEach(btn => btn.addEventListener('click', () => {
  const page = btn.dataset.page;
  if (!profileDropdownMenu.classList.contains('hidden')) {
    profileDropdownMenu.classList.add('hidden');
    profileDropdownToggle.classList.remove('open');
  }

  if (page === 'profile') {
    openProfilePage(currentUser); 
  } else {
    navigateToPage(page);
  }
}));

function navigateToPage(page) {
  navBtns.forEach(b => b.classList.remove('active'));
  profileDropdownToggle.classList.remove('active'); 
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
      profileDropdownToggle.classList.add('active');
    }
    profilePage.classList.remove('hidden');
  } else if (page === "manage-users") {
    document.getElementById('manageUsersBtn').classList.add('active');
    renderUserListPage();
    userListPage.classList.remove('hidden');
  }
}

const allFeedTab = document.getElementById('allFeedTab');
const friendsFeedTab = document.getElementById('friendsFeedTab');
const allFeedContent = document.getElementById('allFeedContent');
const friendsFeedContent = document.getElementById('friendsFeedContent');
const searchInput = document.getElementById('search');

allFeedTab.onclick = () => {
  allFeedTab.classList.add('active');
  friendsFeedTab.classList.remove('active');
  allFeedContent.classList.remove('hidden');
  friendsFeedContent.classList.add('hidden');
  searchInput.placeholder = "Search movies...";
  searchInput.disabled = false;
};

friendsFeedTab.onclick = () => {
  friendsFeedTab.classList.add('active');
  allFeedTab.classList.remove('active');
  friendsFeedContent.classList.remove('hidden');
  allFeedContent.classList.add('hidden');
  searchInput.placeholder = "Search disabled in Friends Feed";
  searchInput.disabled = true;
  renderFriendsFeed();
};

function renderFriendsFeed() {
  if (!currentUser) {
    friendsFeedContent.innerHTML = `<p class="feed-login-prompt">Please <a onclick="showAuth()">log in</a> to see your friends' activity.</p>`;
    return;
  }
  if (currentUser === "admin") {
    friendsFeedContent.innerHTML = `<p class="feed-login-prompt">The admin account cannot follow users. Please log in as a regular user.</p>`;
    return;
  }

  let users = JSON.parse(localStorage.getItem('users'));
  let movies = JSON.parse(localStorage.getItem('movies'));
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

  movies.forEach(movie => {
    if (movie.reviews) {
      movie.reviews.forEach(review => {
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
    }
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
      
        <img src="${item.pfp}" alt="${item.user}" class="feed-user-img" onclick="openProfilePage('${item.user}')" onerror="this.src='${defaultLogo}'">
        
        <div>
          <strong class="feed-user-link" onclick="openProfilePage('${item.user}')">${item.user}</strong> reviewed
          <strong class="feed-movie-link" onclick="openMovie('${item.movieTitle}')">${item.movieTitle}</strong>
          <span class="feed-timestamp">${item.timestamp.toLocaleString()}</span>
        </div>
      </div>
      <div class="feed-item-body">
        <img src="${item.moviePoster}" alt="${item.movieTitle}" class="feed-movie-poster" onclick="openMovie('${item.movieTitle}')">
        <div class="feed-review-content">
          <div class="stars">${getStarString(item.stars)}</div>
          <p>"${item.comment}"</p>
        </div>
      </div>
    </div>
  `}).join('');
}

function checkNotifications() {
  const indicator = document.getElementById('notificationIndicator');
  if (!currentUser || currentUser === 'admin') {
    indicator.classList.add('hidden');
    return;
  }

  let users = JSON.parse(localStorage.getItem('users'));
  const user = users.find(u => u.username === currentUser);

  if (user && user.notifications && user.notifications.some(n => !n.read)) {
    indicator.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
  }
}

function renderNotificationMenu() {
  const list = document.getElementById('notificationList');
  if (!currentUser || currentUser === 'admin') {
    list.innerHTML = '';
    return;
  }

  let users = JSON.parse(localStorage.getItem('users'));
  const user = users.find(u => u.username === currentUser);

  if (!user || !user.notifications || user.notifications.length === 0) {
    list.innerHTML = '<div class="dropdown-notification-empty">No new notifications.</div>';
    return;
  }

  let notifications = [...user.notifications].reverse();

  list.innerHTML = notifications.map(n => {
    if (n.type === 'follow') {
      return `
        <div class="dropdown-notification ${n.read ? 'read' : 'unread'}" onclick="viewUserProfileFromReview('${n.user}')">
          <strong>${n.user}</strong> started following you.
        </div>
      `;
    }
    return ''; 
  }).join('');
}

updateButtons();
renderPremiereHero();
renderFeaturedMovies();
renderMovies();
renderFriendsFeed();
renderRecommendations(); 
checkNotifications(); 
document.querySelector('.nav-link[data-page="home"]').classList.add('active');