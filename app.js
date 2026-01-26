// http://www.omdbapi.com/?i=tt3896198&apikey=1a39d518
console.log("JS LOADED");
// SEARCH BAR
const input = document.querySelector(".search-input");
const btn = document.querySelector(".search__btn");
const movieList = document.querySelector(".movie-list");
const firstBtns = document.querySelectorAll(".select-first");
const resultsText = document.querySelector(".results");
const modalBtn = document.querySelector(".menu-btn");
const moreBtn = document.querySelector(".load__more");
const modalMenu = document.querySelector(".modal-menu");
const modalLinks = document.querySelectorAll(".modal-link, .modal-contact, .modal-close");
const overlay = document.querySelector(".modal-overlay");
const pageClose = document.querySelectorAll(
  ".menu-btn, .title, .search-input, .search__btn",
);
const sortSelect = document.querySelector("#sort-years");
let currentMovies = [];
let movieCount = 0;
let newMovieCount = 6;



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

// SELECT A MOVIE IN NAV
firstBtns.forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    await loadFirstMovies();

    document.getElementById("movies").scrollIntoView({
      behavior: "smooth",
    });
  });
});

/*MODAL FUNCTIONS*/

modalBtn.addEventListener("click", () => {
  modalMenu.classList.toggle("open");
  overlay.classList.toggle("open");
  pageClose.forEach((e) => {
    e.classList.toggle("close");
  });
  document.body.classList.toggle("noscroll");
});

modalLinks.forEach((link) => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    // SELECT A MOVIE IN THE MODAL
    if (link.getAttribute("href") === "#movies") {
      await loadFirstMovies();
      document.getElementById("movies").scrollIntoView({
        behavior: "smooth",
      });
    }

    // CONTACT US IN THE MODAL
    if (link.classList.contains("modal-contact")) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    modalMenu.classList.remove("open");
    overlay.classList.remove("open");
    pageClose.forEach((e) => {
      e.classList.remove("close");
    });
    document.body.classList.remove("noscroll");
  });
});

//SORTING FUNCTION

sortSelect.addEventListener("change", () => {
  if (!currentMovies.length) return;

  const sortType = sortSelect.value;

  const sorted = [...currentMovies].sort((a, b) => {
    const yearA = Number(a.Year);
    const yearB = Number(b.Year);

    if (sortType === "low__to__high") {
      return yearA - yearB;
    }
    else if (sortType === "high__to__low") {
      return yearB - yearA;
    }
    return 0;
  });
  displayMovies(sorted.slice(movieCount, newMovieCount));
});

//LOAD 6 MORE MOVIES

//moreBtn.addEventListener("click", () => {
  //movieCount = (movieCount + 6);
 // newMovieCount = (movieCount + 6);
  
 // displayMovies(currentMovies.slice(movieCount, newMovieCount));

 // if (newMovieCount >= currentMovies.length) {
   // moreBtn.style.display = "none";
  //}


//});


//SKELETON STATE

function showSkeletons() {
  movieList.innerHTML = "";

  const skeletonHTML = `<div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-year"></div>
        </div>`;

  movieList.innerHTML = skeletonHTML.repeat(6);
}





// LOAD MOVIES BY KEYWORD
async function loadMovies(keyword) {
  showSkeletons();
  resultsText.textContent = `Search results for "${keyword}"...`;

  const response = await fetch(
    `https://www.omdbapi.com/?apikey=1a39d518&s=${keyword}`,
  );
  const data = await response.json();

  if (!data.Search) {
    movieList.innerHTML = "<p>No movies found.</p>";
    return;
  }

  currentMovies = data.Search;
  //movieCount = 0;
  //newMovieCount = 6;
  //movieList.innerHTML = "";
 // moreBtn.style.display = currentMovies.length > 6 ? "flex" : "none";

  displayMovies(currentMovies.slice(movieCount, newMovieCount));
}


// LOAD FIRST SIX MOVIES FROM API
async function loadFirstMovies() {
  showSkeletons();
  resultsText.textContent = "Our Top Movies...";

  const response = await fetch(
    `https://www.omdbapi.com/?apikey=1a39d518&s=movie`,
  );
  const data = await response.json();

  if (!data.Search) {
    movieList.innerHTML = "<p>No movies found.</p>";
    return;
  }

  currentMovies = data.Search;
  //movieCount = 0;
  //newMovieCount = 6;
  //movieList.innerHTML = "";
  //moreBtn.style.display = currentMovies.length > 6 ? "flex" : "none";

  displayMovies(currentMovies.slice(movieCount, newMovieCount));
}

// RENDER MOVIES
function displayMovies(movies) {
  movieList.innerHTML = movies
    .map(
      (movie) => `
        <div class="movie">
            <div class="movie-card">
                <div class="movie-card__container">
                    <h3><b>Movie Title:</b> ${movie.Title}</h3>
                    <p><b>Year:</b> ${movie.Year}</p>
                    <img src="${movie.Poster !== "N/A" ? movie.Poster : ""}">
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}
