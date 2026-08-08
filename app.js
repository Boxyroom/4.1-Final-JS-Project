// SEARCH BAR
const input = document.querySelector(".search-input");
const btn = document.querySelector(".search__btn");
const movieList = document.querySelector(".movie-list");
const firstBtns = document.querySelectorAll(".select-first");
const resultsText = document.querySelector(".results");
const modalBtn = document.querySelector(".menu-btn");
const modalMenu = document.querySelector(".modal-menu");
const modalLinks = document.querySelectorAll(
  ".modal-link, .modal-contact, .modal-close",
);
const overlay = document.querySelector(".modal-overlay");
const pageClose = document.querySelectorAll(
  ".menu-btn, .title, .search-input, .search__btn",
);
const sortSelect = document.querySelector("#sort-years");
const contactBtns = document.querySelectorAll(".btn-contact");
const homeLinks = document.querySelectorAll('a[href="#home"]');
let currentMovies = [];

const API_KEY = "1a39d518";
const PLACEHOLDER_POSTER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
      <rect width="300" height="450" fill="#1a2e1a"/>
      <text x="150" y="225" fill="#7cb87c" font-family="sans-serif" font-size="22" text-anchor="middle">No Poster</text>
    </svg>`,
  );

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function movieYear(movie) {
  const match = String(movie.Year || "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function closeModal() {
  modalMenu.classList.remove("open");
  overlay.classList.remove("open");
  pageClose.forEach((el) => {
    el.classList.remove("close");
  });
  document.body.classList.remove("noscroll");
}

function handleContact() {
  window.location.href =
    "mailto:hello@moviesite.example?subject=Movie%20Site%20Inquiry";
}

// SEARCH BUTTON
btn.addEventListener("click", () => {
  const keyword = input.value.trim();
  if (!keyword) return;
  loadMovies(keyword);
});

// ENTER KEY
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btn.click();
  }
});

// SELECT A MOVIE IN NAV / FOOTER
firstBtns.forEach((navBtn) => {
  navBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    await loadFirstMovies();

    document.getElementById("movies").scrollIntoView({
      behavior: "smooth",
    });
  });
});

// HOME LINKS
homeLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

// CONTACT US
contactBtns.forEach((contactBtn) => {
  contactBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleContact();
  });
});

/* MODAL FUNCTIONS */

modalBtn.addEventListener("click", () => {
  modalMenu.classList.toggle("open");
  overlay.classList.toggle("open");
  pageClose.forEach((el) => {
    el.classList.toggle("close");
  });
  document.body.classList.toggle("noscroll");
});

overlay.addEventListener("click", closeModal);

modalLinks.forEach((link) => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    if (link.getAttribute("href") === "#movies") {
      await loadFirstMovies();
      document.getElementById("movies").scrollIntoView({
        behavior: "smooth",
      });
    } else if (link.getAttribute("href") === "#home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (link.classList.contains("modal-contact")) {
      handleContact();
    }

    closeModal();
  });
});

// SORTING
sortSelect.addEventListener("change", () => {
  if (!currentMovies.length) return;
  displayMovies(applySort());
});

// SKELETON STATE
function showSkeletons() {
  const skeletonHTML = `<div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-year"></div>
        </div>`;

  movieList.innerHTML = skeletonHTML.repeat(6);
}

function applySort() {
  const sortType = sortSelect.value;
  const moviesToSort = currentMovies.slice(0, 6);

  if (sortType === "low__to__high") {
    return [...moviesToSort].sort((a, b) => movieYear(a) - movieYear(b));
  }

  if (sortType === "high__to__low") {
    return [...moviesToSort].sort((a, b) => movieYear(b) - movieYear(a));
  }

  return moviesToSort;
}

async function fetchMovies(keyword) {
  const response = await fetch(
    `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(keyword)}`,
  );

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json();
}

// LOAD MOVIES BY KEYWORD
async function loadMovies(keyword) {
  showSkeletons();
  sortSelect.value = "";
  resultsText.textContent = `Search results for "${keyword}"...`;

  try {
    const data = await fetchMovies(keyword);

    if (!data.Search) {
      currentMovies = [];
      movieList.innerHTML = `<p class="empty-state">${escapeHtml(data.Error || "No movies found.")}</p>`;
      return;
    }

    currentMovies = data.Search;
    displayMovies(applySort());
  } catch (error) {
    currentMovies = [];
    movieList.innerHTML =
      '<p class="empty-state">Something went wrong loading movies. Please try again.</p>';
    console.error(error);
  }
}

// LOAD FIRST SIX MOVIES FROM API
async function loadFirstMovies() {
  showSkeletons();
  sortSelect.value = "";
  resultsText.textContent = "Our Top Movies...";

  try {
    const data = await fetchMovies("movie");

    if (!data.Search) {
      currentMovies = [];
      movieList.innerHTML = `<p class="empty-state">${escapeHtml(data.Error || "No movies found.")}</p>`;
      return;
    }

    currentMovies = data.Search;
    displayMovies(applySort());
  } catch (error) {
    currentMovies = [];
    movieList.innerHTML =
      '<p class="empty-state">Something went wrong loading movies. Please try again.</p>';
    console.error(error);
  }
}

// RENDER MOVIES
function displayMovies(movies) {
  movieList.innerHTML = movies
    .map((movie) => {
      const title = escapeHtml(movie.Title);
      const year = escapeHtml(movie.Year);
      const poster =
        movie.Poster && movie.Poster !== "N/A"
          ? escapeHtml(movie.Poster)
          : PLACEHOLDER_POSTER;

      return `
        <div class="movie">
            <div class="movie-card">
                <div class="movie-card__container">
                    <h3><b>Movie Title:</b> ${title}</h3>
                    <p><b>Year:</b> ${year}</p>
                    <img src="${poster}" alt="Poster for ${title}" loading="lazy">
                </div>
            </div>
        </div>
      `;
    })
    .join("");
}
