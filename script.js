//API Keys
const readAccessToken = "[redacted]";
const apiKey = "[redacted]";

const APIoptions = {
	method: "GET",
	headers: {
		accept: "application/json",
		Authorization: "Bearer " + readAccessToken,
	},
};

//Onload
function loadHandler() {
	addListeners();
	//getKey();
	//chooseSecret();
}

// let userReadAccessToken;
// const APIoptions = {
// 	method: "GET",
// 	headers: {
// 		accept: "application/json",
// 		Authorization: "Bearer " + userReadAccessToken,
// 	},
// };

function addListeners() {
	inputGuess.addEventListener("keypress", function (event) {
		if (event.key === "Enter") {
			event.preventDefault();
			document.getElementById("btnGuess").click();
		}
	});

	inputGuess.addEventListener("input", function (event) {
		const guessInputTxt = event.target.value.trim().toLowerCase();
		searchMovies(guessInputTxt);
	});
}

async function callAPI(url) {
	try {
		const response = await fetch(url, APIoptions);
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		const json = await response.json();
		return json;
	} catch (error) {
		console.error(error.message);
	}
}

function getKey() {
	if (localStorage.getItem("apiKey") == null) {
		requestKey();
	} else return localStorage.getItem("apiKey");
}

function requestKey() {
	const keyModal = new bootstrap.Modal(
		document.getElementById("apiKeyModal"),
		{}
	);
	keyModal.toggle();
}

//Choose secret movie
const selections = chooseItem();
const secretMovieID = randomAPI(selections[0], selections[1]); // this will be a promise that has to be awaited when referenced

function chooseItem() {
	var itemSelected = Math.floor(Math.random() * 1500); // Picks one of the top 1500 items so that the item chosen isn't too obscure
	var page = Math.ceil(itemSelected / 20); // API returns 20 items per page
	var indexOnPage = itemSelected % 20;
	return [page, indexOnPage];
}

async function randomAPI(page, indexOnPage) {
	const url =
		"https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=" + page;
	const apiJSON = await callAPI(url);
	const result = apiJSON.results[indexOnPage];
	if (result.original_language != "en") {
		console.log("choosing again...");
		const selections = chooseItem();
		randomAPI(selections[0], selections[1]);
	} else {
		console.log(result);
		return result.id;
	}
}

//Live guess search
const resultsContainer = document.getElementById("searchResults");
const movieUnavailableTxt = document.getElementById("searchFailText");

const searchMovies = async (guessInputTxt) => {
	//run API call for text in search box
	const baseUrl = "https://api.themoviedb.org/3/search/movie?query=";
	const guessString = encodeURIComponent(guessInputTxt);
	const url = baseUrl + guessString;

	const apiJSON = await callAPI(url);
	const results = apiJSON.results;

	renderResults(results);
};

const renderResults = (results) => {
	//display API results for live search
	resultsContainer.innerHTML = "";
	movieUnavailableTxt.style.display = "none";

	//don't show obscure search results
	const filteredResults = results.filter(
		(result) => result.popularity > 1 && result.original_language == "en"
	);

	const posterBaseURL = "https://image.tmdb.org/t/p/w185/";
	filteredResults.forEach((result) => {
		resultsContainer.innerHTML += `
     <div class="movieCard hover row" onclick="guess(${result.id})">
       <img src="${posterBaseURL}${result.poster_path}" alt="Movie poster for ${result.title}" class="movieImage col" />
	   <div class="col">
       <h2 class="title">${result.title}</h2>
       <p class="plot">${result.overview}</p>
	   </div>
     </div>
   `;
	});
};

async function guess(guessID) {
	// use selection as guess for comparison to movie of the day
	if (guessID == (await secretMovieID)) {
		showWin();
	} else {
		const guessDetails = await movieDetails(guessID);
		console.log(guessDetails);
		const secretMovieDetails = await movieDetails(await secretMovieID);
		console.log(secretMovieDetails);
		const score = await evaluateGuess(guessDetails, secretMovieDetails);
	}
	clearGuess();
}

const movieDetails = async (movieID) => {
	//gets info from the Movie Details endpoint of TMBD API
	const baseUrl = "https://api.themoviedb.org/3/movie/";
	const url = baseUrl + movieID;
	const apiJSON = await callAPI(url);
	return apiJSON;
};

const evaluateGuess = async (guessDetails, secretDetails) => {
	//compares each item to the secret movie's detail and returns clues
	const guessTitle = guessDetails.title;
	const guessYear = new Date(guessDetails.release_date).getYear();
	const guessGenres = guessDetails.genres.map((a) => a.name);
	const guessGenreSet = new Set(guessGenres);
	console.log(guessGenreSet);
	const guessPopularity = guessDetails.popularity;
	const guessBudget = guessDetails.budget;
	const guessRuntime = guessDetails.runtime;
	const guessAvgRating = guessDetails.vote_average;

	const secretTitle = secretDetails.title;
	const secretYear = new Date(secretDetails.release_date).getYear();
	const secretGenres = secretDetails.genres.map((a) => a.name);
	const secretGenreSet = new Set(secretGenres);
	console.log(secretGenreSet);
	const sharedGenres = secretGenreSet.intersection(guessGenreSet);
	console.log(sharedGenres);
	const secretPopularity = secretDetails.popularity;
	const secretBudget = secretDetails.budget;
	const secretRuntime = secretDetails.runtime;
	const secretAvgRating = secretDetails.vote_average;

	if (sharedGenres.size == 0) {
		console.log("Genre Red");
	} else if (
		guessGenreSet.size == secretGenreSet.size &&
		secretGenreSet.size == sharedGenres.size
	) {
		console.log("Genre Green");
	} else {
		console.log("Genre Yellow");
	}
};

function clearGuess() {
	// clear search box and previous search results
	inputGuess.value = "";
	resultsContainer.innerHTML = "";
}

function clearAPIKeyInput() {
	inputAPIKey.value = "";
}

function showWin() {
	console.log("you won!");
}
