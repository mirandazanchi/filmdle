//API Keys
const readAccessToken = localStorage.getItem("readAccessToken");

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

//Standard API call
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

const movieDetails = async (movieID) => {
	//gets info from the Movie Details endpoint of TMDB API
	const baseUrl = "https://api.themoviedb.org/3/movie/";
	const url = baseUrl + movieID;
	const apiJSON = await callAPI(url);
	return apiJSON;
};

//Choose secret movie
const secretID = chooseSecret();
const secretMovieID = secretID;

function chooseSecret() {
	const selection = chooseItem();
	return randomAPI(selection);
}

function chooseItem() {
	var selection = Math.floor(Math.random() * 1500); // Picks one of the top 1500 items so that the item chosen isn't too obscure
	return selection;
}

async function randomAPI(selection) {
	var page = Math.ceil(selection / 20); // API returns 20 items per page
	var indexOnPage = selection % 20;
	const url =
		"https://api.themoviedb.org/3/discover/movie?language=en-US&page=1&sort_by=vote_average.desc&without_genres=99&vote_count.gte=200&with_original_language=en&page=" +
		page;
	const apiJSON = await callAPI(url);
	const result = apiJSON.results[indexOnPage];
	console.log(result);
	return result.id;
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

	renderSearchResults(results);
};

const renderSearchResults = (results) => {
	//display API results for live search
	resultsContainer.innerHTML = "";
	movieUnavailableTxt.style.display = "none";

	//don't show obscure search results
	const filteredResults = results.filter(
		(result) => result.popularity > 1 && result.original_language == "en"
	);

	const posterBaseURL = "https://image.tmdb.org/t/p/w185/";
	filteredResults.forEach((result) => {
		if (result.poster_path != null) {
			resultsContainer.innerHTML += `
     <div class="movieCard hover row" onclick="guess(${result.id})">
       <img src="${posterBaseURL}${result.poster_path}" alt="Movie poster for ${result.title}" class="movieImage col" />
	   <div class="col">
       <h2 class="title">${result.title}</h2>
       <p class="plot">${result.overview}</p>
	   </div>
     </div>
   `;
		} else {
			resultsContainer.innerHTML += `
     <div class="movieCard hover row" onclick="guess(${result.id})">
       <img src="posterUnavailable.png" alt="Poster unavailable for ${result.title}" class="movieImage col" />
	   <div class="col">
       <h2 class="title">${result.title}</h2>
       <p class="plot">${result.overview}</p>
	   </div>
     </div>
   `;
		}
	});
};

async function guess(guessID) {
	// use selection as guess for comparison to movie of the day
	if (guessID == (await secretMovieID)) {
		showWin();
	} else {
		const guessDetails = await movieDetails(guessID);
		console.log(guessDetails);

		const secretDetails = movieDetails(await secretMovieID);
		console.log(await secretDetails);
		const score = await evaluateGuess(guessDetails, await secretDetails);
	}
	clearGuess();
}

const evaluateGuess = async (guessDetails, secretDetails) => {
	//compares each item to the secret movie's detail and returns clues
	const guessTitle = guessDetails.title;

	var scores = {};

	//Year
	const guessYear = new Date(guessDetails.release_date).getYear();
	const secretYear = new Date(secretDetails.release_date).getYear();

	if (guessYear == secretYear) {
		scores.yearScore = "correct";
	} else if (Math.abs(guessYear - secretYear) < 5) {
		scores.yearScore = "close";
	} else {
		scores.yearScore = "wrong";
	}

	if (secretYear > guessYear) {
		scores.yearDirection = "up";
	} else {
		scores.yearDirection = "down";
	}

	//Genres
	const guessGenres = new Set(guessDetails.genres.map((a) => a.name));
	const secretGenres = new Set(secretDetails.genres.map((a) => a.name));
	const sharedGenres = secretGenres.intersection(guessGenres);
	var genreScore = null;
	if (sharedGenres.size == 0) {
		scores.genreScore = "wrong";
	} else if (
		guessGenres.size == secretGenres.size &&
		secretGenres.size == sharedGenres.size
	) {
		scores.genreScore = "correct";
	} else {
		scores.genreScore = "close";
	}

	//Popularity
	const guessPop = guessDetails.popularity;
	const secretPop = secretDetails.popularity;

	if (guessPop == secretPop) {
		scores.popScore = "correct";
	} else if (Math.abs(guessPop - secretPop) < 5) {
		scores.popScore = "close";
	} else {
		scores.popScore = "wrong";
	}

	if (secretPop > guessPop) {
		scores.popDirection = "up";
	} else {
		scores.popDirection = "down";
	}

	//Budget
	const guessBudget = guessDetails.budget;
	const secretBudget = secretDetails.budget;
	const guessBudgetDisplay = guessBudget;

	if (
		guessBudget == 0 ||
		guessBudget == null ||
		secretBudget == 0 ||
		secretBudget == null
	) {
		scores.budgetScore = null;
	} else {
		//scores.budgetScore ;
	}

	//Runtime
	const guessRuntime = guessDetails.runtime;
	const secretRuntime = secretDetails.runtime;

	//Rating
	const guessAvgRating = guessDetails.vote_average;
	const secretAvgRating = secretDetails.vote_average;

	console.log(scores);
};

function renderGuessScore() {}

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
