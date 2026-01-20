// http://www.omdbapi.com/?i=tt3896198&apikey=1a39d518

// SEARCH BAR
const input = document.querySelector('.search-input');
const btn = document.querySelector('.search__btn');
const movieList = document.querySelector('.movie-list');
const firstBtn = document.querySelector('.select-first');
const resultsText = document.querySelector('.results');

// SEARCH BUTTON
btn.addEventListener('click', () => {
    const keyword = input.value.trim();
    if (!keyword) return;
    loadMovies(keyword);
});

// ENTER KEY
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        btn.click();
    }
});

// SELECT A MOVIE IN NAV
firstBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    await loadFirstMovies();

    document.getElementById('movies').scrollIntoView({
    behavior: 'smooth'
});

});

//SKELETON STATE

function showSkeletons() {
    movieList.innerHTML = "";

    const skeletonHTML = 
        `<div class="skeleton-card">
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

    const response = await fetch(`https://www.omdbapi.com/?apikey=1a39d518&s=${keyword}`);
    const data = await response.json();

    if (!data.Search) {
        movieList.innerHTML = "<p>No movies found.</p>";
        return;
    }

    displayMovies(data.Search.slice(0, 6));
}

// LOAD FIRST SIX MOVIES FROM API
async function loadFirstMovies() {
    showSkeletons();
    resultsText.textContent = "Our Top Movies...";

    const response = await fetch(`https://www.omdbapi.com/?apikey=1a39d518&s=movie`);
    const data = await response.json();

    if (!data.Search) {
        movieList.innerHTML = "<p>No movies found.</p>";
        return;
    }

    displayMovies(data.Search.slice(0, 6));
}

// RENDER MOVIES
function displayMovies(movies) {

     const placeholder = document.getElementById("placeholder");
    if (placeholder) {
        placeholder.style.opacity = "0";
        setTimeout(() => {
            placeholder.style.display = "none";
        }, 400);
    }

    movieList.innerHTML = movies.map(movie => `
        <div class="movie">
            <div class="movie-card">
                <div class="movie-card__container">
                    <h3><b>Movie Title:</b> ${movie.Title}</h3>
                    <p><b>Year:</b> ${movie.Year}</p>
                    <img src="${movie.Poster !== 'N/A' ? movie.Poster : ''}">
                </div>
            </div>
        </div>
    `).join('');
}
