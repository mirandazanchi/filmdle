const http = require("http");
const fs = require("fs");
const port = 3000;

const server = http.createServer(function (req, res) {
	res.writeHead(200, { "Content-Type": "text / html" });
	fs.readFile("index.html", function (err, data) {
		if (err) {
			res.writeHead(404);
			res.write("Error 404");
		} else {
			res.write(data);
		}
		res.end();
	});
});

server.listen(port, function (err) {
	if (err) {
		console.log("An error occurred", err);
	} else {
		console.log("Server listening on port " + port);
	}
});
