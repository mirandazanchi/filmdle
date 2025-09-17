//API Keys
var readAccessToken = localStorage.getItem("readAccessToken");

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
	getKey();
}

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

	inputAPIKey.addEventListener("keypress", function (event) {
		if (event.key === "Enter") {
			event.preventDefault();
			document.getElementById("btnSubmitKey").click();
		}
	});
}

function getKey() {
	if (localStorage.getItem("readAccessToken") == null) {
		const keyModal = new bootstrap.Modal(
			document.getElementById("apiKeyModal"),
			{}
		);
		keyModal.toggle();
	}
}

async function sendAPIKey() {
	var input = document.getElementById("inputAPIKey");
	var testAccessToken = input.value;
	const alertHolder = document.getElementById("alertHolder");
	alertHolder.innerHTML = "";

	const url = "https://api.themoviedb.org/3/authentication";

	var testResponse = await fetch(url, {
		method: "GET",
		headers: {
			accept: "application/json",
			Authorization: "Bearer " + testAccessToken,
		},
	});

	if (testResponse.ok) {
		localStorage.setItem("readAccessToken", testAccessToken);
		location.reload();
	} else {
		alertHolder.innerHTML = `<div class="alert alert-danger" role="alert">
			  <div>Authentication failed - please try again</div>
			</div>`;
		clearAPIKeyInput();
	}
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

async function movieDetails(movieID) {
	//gets info from the Movie Details endpoint of TMDB API
	const baseUrl = "https://api.themoviedb.org/3/movie/";
	const url = baseUrl + movieID;
	const apiJSON = await callAPI(url);
	return apiJSON;
}

var guessNumber = 0;
var hintsUsed = 0;

//Choose secret movie
const secretDetails = chooseSecret();

function chooseSecret() {
	const selection = chooseItem();
	const details = randomAPI(selection);
	return details;
}

function chooseItem() {
	var selection = Math.floor(Math.random() * 1500); // Picks one of the top 1500 items so that the item chosen isn't too obscure
	return selection;
}

async function randomAPI(selection) {
	var page = Math.ceil(selection / 20); // API returns 20 items per page
	var indexOnPage = selection % 20;
	const randomURL =
		"https://api.themoviedb.org/3/discover/movie?language=en-US&page=1&sort_by=vote_average.desc&without_genres=99&vote_count.gte=200&with_original_language=en&page=" +
		page;
	const apiJSON = await callAPI(randomURL);
	const resultID = apiJSON.results[indexOnPage].id;

	const detailsURL =
		"https://api.themoviedb.org/3/movie/" +
		resultID +
		"?append_to_response=credits";
	const detailsJSON = await callAPI(detailsURL);
	console.log(detailsJSON);
	return detailsJSON;
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
	guessNumber++;
	if (guessNumber < 11) {
		//max 10 guesses
		const guessDetails = await movieDetails(guessID);
		console.log(guessDetails);
		const score = await evaluateGuess(guessDetails, await secretDetails);
		renderGuessScore(score, guessDetails);
	} else {
		console.log("guess max reached");
	}
	clearGuess();
}

const evaluateGuess = async (guessDetails, secretDetails) => {
	if (guessDetails.id == (await secretDetails.id)) {
		showWin();
	} else {
		//compares each item to the secret movie's detail and returns clues
		const guessTitle = guessDetails.title;

		var scores = {};

		//Year
		const guessYear = new Date(guessDetails.release_date).getFullYear();
		const secretYear = new Date(secretDetails.release_date).getFullYear();
		scores.year = compareValues(guessYear, secretYear, 5);

		//Genres
		const guessGenres = new Set(guessDetails.genres.map((a) => a.name));
		const secretGenres = new Set(secretDetails.genres.map((a) => a.name));
		const sharedGenres = secretGenres.intersection(guessGenres);
		scores.genre = {};

		if (sharedGenres.size == 0) {
			scores.genre.correctness = "wrong";
		} else if (
			guessGenres.size == secretGenres.size &&
			secretGenres.size == sharedGenres.size
		) {
			scores.genre.correctness = "correct";
		} else {
			scores.genre.correctness = "close";
		}

		//Popularity
		const guessPop = guessDetails.popularity;
		const secretPop = secretDetails.popularity;
		scores.popularity = compareValues(guessPop, secretPop, 5);

		//Runtime
		const guessRuntime = guessDetails.runtime;
		const secretRuntime = secretDetails.runtime;
		scores.runtime = compareValues(guessRuntime, secretRuntime, 15);

		//Rating
		const guessRating = guessDetails.vote_average.toFixed(1);
		const secretRating = secretDetails.vote_average.toFixed(1);
		scores.rating = compareValues(guessRating, secretRating, 1);

		console.log(scores);
		return scores;
	}
};

function compareValues(guess, secret, range) {
	//compares the guess to the secret, using the range to define what counts as 'close'
	var results = {};
	if (guess == secret) {
		results.correctness = "correct";
	} else if (Math.abs(guess - secret) < range) {
		results.correctness = "close";
	} else {
		results.correctness = "wrong";
	}

	if (secret > guess) {
		results.direction = "up";
	} else {
		results.direction = "down";
	}
	return results;
}

function renderGuessScore(scores, guessDetails) {
	const guessTable = document.getElementById("guessTableBody");
	if (guessDetails.release_date == null || guessDetails.release_date == "") {
		var guessYear = null;
	} else {
		var guessYear = new Date(guessDetails.release_date).getFullYear();
	}
	const genreText = guessDetails.genres.map((a) => a.name).join(", ");
	const posterBaseURL = "https://image.tmdb.org/t/p/w185/";
	guessTable.innerHTML += `	<tr>
								<th>${guessNumber} of 10</td>
								<td><img src="${posterBaseURL}${
		guessDetails.poster_path
	}" alt="Movie poster for ${guessDetails.title}"/</td>
								<td>${guessDetails.title ?? ""}</td>
								<td class="${scores.year.correctness}">${guessYear ?? "Unknown"}</td>
								<td>${genreText ?? "Unknown"}</td>
								<td>${guessDetails.popularity.toFixed(1) ?? ""}</td>
								<td>${guessDetails.runtime ?? "Unknown"} minutes</td>
								<td>${guessDetails.vote_average.toFixed(1) ?? ""}/10</td>
							</tr>
							<tr>
								<td></td>
								<td></td>
								<td></td>
								<td>${scores.year.correctness} - ${scores.year.direction}</td>
								<td>${scores.genre.correctness}</td>
								<td>${scores.popularity.correctness} - ${scores.popularity.direction}</td>
								<td>${scores.runtime.correctness} - ${scores.runtime.direction}</td>
								<td>${scores.rating.correctness} - ${scores.rating.direction}</td>
							</tr>`;
}

function clearGuess() {
	// clear search box and previous search results
	inputGuess.value = "";
	resultsContainer.innerHTML = "";
}

function clearAPIKeyInput() {
	// clear user input when x is clicked
	inputAPIKey.value = "";
}

function showWin() {
	console.log("you won!");
}

function addHints() {
	const hintActor = document.getElementById("hintTopBilled");
	const hintDirector = document.getElementById("hintDirector");
	const hintTagline = document.getElementById("hintTagline");

	const actor = secretDetails.credits.cast[0].name;
	const director = secretDetails.credits.crew[0].name; //need to filter crew for director credit
	const tagline = secretDetails.tagline;

	console.log(actor, tagline);
}

function revealSecret() {}
