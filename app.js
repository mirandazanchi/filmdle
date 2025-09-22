const express = require("express");
const app = express();
const http = require("http");
const fs = require("fs");
const port = 3000;

// const sass = require("sass");
// const bootstrap = require("bootstrap");

app.use(express.static("public"));

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

// const APIoptions = {
// 	method: "GET",
// 	headers: {
// 		accept: "application/json",
// 		Authorization: "Bearer " + readAccessToken,
// 	},
// };

// async function callAPI(url) {
// 	try {
// 		const response = await fetch(url, APIoptions);
// 		if (!response.ok) {
// 			throw new Error(`Response status: ${response.status}`);
// 		}
// 		const json = await response.json();
// 		return json;
// 	} catch (error) {
// 		console.error(error.message);
// 	}
// }
