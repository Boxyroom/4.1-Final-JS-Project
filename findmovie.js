// http://www.omdbapi.com/?i=tt3896198&apikey=1a39d518
/*
const movieListEl = document.querySelector(".movie-list");

async function main() {
    const movies = await fetch("http://www.omdbapi.com/?i=tt3896198&apikey=1a39d518s=${input}");
    const moviesData = await movies.json();
    movieListEl.innerHTML = moviesData.map((user) => movieHTML(movie)).join("");
}

main();

function showUserPosts(id) {
    localStorage.setItem("id", id);
    window.location.href = `${window.location.origin}/user.html`
}

function userHTML(user) {
    return `<div class="user-card" onclick="showUserPosts(${user.id})">
                <div class="user-card__container">
                    <h3><b>Movie Title:</b>MOVIE TITLE</h3>
                    <p><b>Year:</b>RELEASE YEAR</p>
                    <img src="https://m.media-amazon.com/images/M/MV5BMTk0MTAyNjQ2N15BMl5BanBnXkFtZTcwNjYwOTU3Mw@@._V1_SX300.jpg">
                </div>
            </div>`;
}

*/ 
const params = new URLSearchParams(window.location.search);
    const keyword = params.get("search");

    async function loadMovies() {
        if (!keyword) return;

        const response = await fetch(`https://www.omdbapi.com/?apikey=1a39d518&s=${keyword}`);
        const data = await response.json();

        const list = document.querySelector('.movie-list');
        list.innerHTML = ""; // clear placeholder

        if (!data.Search) {
            list.innerHTML = "<p>No movies found.</p>";
            return;
        }

        data.Search.forEach(movie => {
            list.innerHTML += `
                <div class="movie">
                    <div class="movie-card">
                        <div class="movie-card__container">
                            <h3><b>Movie Title:</b> ${movie.Title}</h3>
                            <p><b>Year:</b> ${movie.Year}</p>
                            <img src="${movie.Poster !== 'N/A' ? movie.Poster : ''}">
                        </div>
                    </div>
                </div>
            `;
        });
    }

    loadMovies();