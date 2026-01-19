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
const input = document.querySelector('.search__wrapper input');
const btn = document.querySelector('.search__btn');

btn.addEventListener('click', () => {
    const keyword = input.value.trim();
    if (!keyword) return;

    window.location.href = `findmovie.html?search=${encodeURIComponent(keyword)}`;
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        btn.click();
    }
});