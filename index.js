const express = require("express");
const WebSocket = require("ws");
const app = express();
const shortid = require("shortid");

app.set("view engine", "ejs");
app.get("/", (req, res) => {
	res.render("index");
});

app.get("/webcam", (req, res) => {
	res.render("webcam");
});

let port = process.env.PORT || 8080;
let httpServer = app.listen(port, () =>
	console.log(`http://localhost:${port}`)
);
let ws = new WebSocket.Server({ server: httpServer }, () => {
	console.log("WS server is running");
});

let peers = new Set();
ws.on("connection", (client, req) => {
	
	const userAgent = req.headers['user-agent'];
    const osType = getOSType(userAgent); // loại hệ điều hành
	client.id = shortid.generate();
	peers.add(client.id);
	console.log(`Client ${client.id} connected using ${osType}`);

	client.send(JSON.stringify({ type: "id", data: client.id, os: osType }));
	client.send(
		JSON.stringify({ type: "peer-list", data: JSON.stringify([...peers]) })
	);

	ws.clients.forEach((c) => {
		if (c !== client) {
			c.send(JSON.stringify({ type: "new-peer", data: client.id, os: osType }));
		}
	});

	client.on("error", (e) => {
		console.log("Client error");
		console.log(e);
	});

	client.on("message", (message) => {
		console.log(`Client ${client.id}: ${message}`);
		ws.clients.forEach((c) => {
			if (c !== client) {
				c.send(message);
			}
		});
	});

	client.on("close", () => {
		console.log(`Client ${client.id} disconnected`);
		peers.delete(client.id);
		ws.clients.forEach((c) => {
			if (c !== client) {
				c.send(JSON.stringify({ type: "peer-leave", data: client.id }));
			}
		});
	});
});

ws.on("error", (e) => {
	console.log("WS Server error");
	console.log(e);
});

setInterval(() => {
	ws.clients.forEach((c) => c.send(JSON.stringify({ type: "ping" })));
}, 20000);

function getOSType(userAgent) {
    // Check for Windows
    if (userAgent.indexOf("Windows") !== -1) {
        return "Windows";
    }

    // Check for Mac OS
    if (userAgent.indexOf("Macintosh") !== -1) {
        return "Mac OS";
    }

    // Check for Linux
    if (userAgent.indexOf("Linux") !== -1) {
        return "Linux";
    }

    // Check for Android
    if (userAgent.indexOf("Android") !== -1) {
        return "Android";
    }

    // Check for iOS
    if (userAgent.indexOf("iPhone") !== -1 || userAgent.indexOf("iPad") !== -1 || userAgent.indexOf("iPod") !== -1) {
        return "iOS";
    }

    // If none of the above, return unknown
    return "Unknown";
}