const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const authUtils = require("./auth-util.js");
const generateID = require("./services/tools.js");
const getAllOntologies = require("./services/cropontologies.js");
const pushCredentialsToBaserow = require("./services/services.js");
const ontData = require("./data.json");
const cookieParser = require("cookie-parser");
const app = express();
const upload = multer({ dest: "uploads/" });

const discoveryUri = process.env.DISCOVERY_URI;
const redirectUri = process.env.OAUTH_REDIRECT_URI;

var OAuthClient;
authUtils.buildAuthClient(
	discoveryUri,
	redirectUri,
	process.env.CLIENT_ID,
	process.env.CLIENT_SECRET,
	(client) => (OAuthClient = client)
);

app.use(express.json());
app.use(cookieParser());

app.use(cors());

app.get("/", () => {
	res.send("Rootly!!");
});

app.get("/login", function (req, res, next) {
	res.redirect(authUtils.getAuthURL(OAuthClient));
});

app.get("/logout", function (req, res, next) {
	
	res.clearCookie("token", {
		httpOnly: true
	});
	res.clearCookie("UUID", {
		httpOnly: true
	});

	res.status(200).json({ message: "Logged out successfully" });
});

app.get("/redirect", async function (req, res, next) {
	var token = await authUtils.verifyTokenResponse(
		OAuthClient,
		req,
		redirectUri
	);
	if (token) {
		console.log(token);
		try {
			if (token) {
				const { email, preferred_username, name } = token.claims();

				let newUserID = await pushCredentialsToBaserow(name, email);
				console.log(newUserID);

				let jwtToken = token.id_token;
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
				res.setHeader(
					"Access-Control-Allow-Headers",
					"Content-Type, Authorization"
				);
				res.setHeader("Access-Control-Allow-Credentials", true);

				res.cookie("token", jwtToken, {
					httpOnly: true,
				});

				res.cookie("UUID", newUserID, {
					httpOnly: true,
				});

				res.json({
					status: 200,
					message: "Login successful",
					email: email,
					username: preferred_username,
					name: name,
				});
			} else {
				res
					.status(400)
					.send({ status: 400, message: "Unable to decode token" });
			}
		} catch (error) {
			console.log("Error decoding the token:", error);
			res
				.status(500)
				.send({ status: 500, message: "Error decoding the token" });
		}
	} else {
		console.log("something is very fishy");
		res
			.status(401)
			.send({ status: 401, message: "Token not found or invalid" });
	}
});

app.get("/user-info", async (req, res) => {
	let token = req.cookies.token || null;
	let UUID = req.cookies.UUID || null;

	if (token) {
		try {
			const decoded = await authUtils.verifyToken(token, discoveryUri);
			res.json({
				username: decoded.username,
				email: decoded.email,
				name: decoded.name,
				UUID: UUID,
			});
		} catch (err) {
			res.status(401).json({ message: "Invalid or expired token" });
		}
	} else {
		res.status(400).json({ message: "No token provided" });
	}
});

app.post("/getUserLists", async (req, res) => {
	try {
		let email = req.body.email;

		const bRowURL =
			"https://portal.ardbase.org/api/database/rows/table/675/?user_field_names=true";

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
				"Content-Type": "application/json",
			},
		});

		const userObj = response.data.results.find((item) => item.Email === email);

		let listInformation = [];
		let lists = userObj.Lists;

		for (let i = 0; i < userObj.Lists.length; i++) {
			const bRowURL = `https://portal.ardbase.org/api/database/rows/table/676/${lists[i].id}/?user_field_names=true`;

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});
			listInformation.push(response.data);
		}

		res.status(response.status).json(listInformation);
	} catch (error) {
		console.log(error);
	}
});

app.post("/getListInfo", async (req, res) => {
	try {
		const bRowURL =
			"https://portal.ardbase.org/api/database/rows/table/676/?user_field_names=true";

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
				"Content-Type": "application/json",
			},
		});

		let items = response.data.results;

		const matchedList = items.filter(
			(item) => item["List ID"] === req.body.listId
		);

		let listName = matchedList[0].Name;

		// let owner = items.Owner[0].value; // compute the id of the user with another bRow request

		const bRowURL2 =
			"https://portal.ardbase.org/api/database/rows/table/677/?user_field_names=true&size=200";

		const response1 = await axios.get(bRowURL2, {
			headers: {
				Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
				"Content-Type": "application/json",
			},
		});

		let listContent = response1.data.results;

		const matchedItems = listContent.filter((item) =>
			item["List ID"].some((list) => list.value === req.body.listId)
		);

		variableDbIds = [];
		for (let i = 0; i < matchedItems.length; i++) {
			variableDbIds.push(matchedItems[i]["Variable Db Id"]);
		}

		const cropOntologyUrl = "http://127.0.0.1:5900/brapi/v2/search/variables";

		const reqBody = {
			observationVariableDbIds: variableDbIds,
		};

		console.log(reqBody);

		const response2 = await axios.post(cropOntologyUrl, reqBody);

		let resBody = {
			listName: listName,
			items: response2.data.result,
		};

		res.status(response.status).json(resBody);
	} catch (error) {
		console.error("Error making the POST request:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
});

app.get("/getLists", async (req, res) => {
	try {
		const bRowURL =
			"https://portal.ardbase.org/api/database/rows/table/676/?user_field_names=true";

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
				"Content-Type": "application/json",
			},
		});

		res.status(response.status).json(response.data);
	} catch (error) {
		console.error("Error making the POST request:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
});

app.post("/createList", async (req, res) => {
	try {
		const requestData = req.body;

		console.log(requestData);

		let listId = await generateID();
		let traits = requestData.traits;

		const req_data = {
			"List ID": listId,
			Name: req.body.listName,
			Owner: [req.body.userId],
			Length: requestData.traits.length,
		};

		console.log(req_data);
		// Creating the list in the list table

		const firstUrl =
			"https://portal.ardbase.org/api/database/rows/table/676/?user_field_names=true";

		const response = await axios.post(firstUrl, req_data, {
			headers: {
				Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
				"Content-Type": "application/json",
			},
		});

		// Creating the lsit content in the list content table

		const secondUrl =
			"https://portal.ardbase.org/api/database/rows/table/677/?user_field_names=true";

		for (let i = 0; i < requestData.traits.length; i++) {
			const listContentData = {
				"List Content ID": await generateID(),
				"List ID": [listId],
				"Variable Db Id": traits[i].observationVariableDbId,
			};

			const response1 = await axios.post(secondUrl, listContentData, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});
			console.log(response1);
		}

		res.status(response.status).json(response.data);
	} catch (error) {
		console.error("Error making the POST request:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
});

app.post("/upload", upload.single("file"), (req, res) => {
	if (!req.file) {
		return res.status(400).json({ message: "No file uploaded" });
	}

	const filePath = path.join(__dirname, req.file.path);

	fs.readFile(filePath, "utf8", (err, data) => {
		if (err) {
			return res.status(500).json({ message: "Error reading file" });
		}

		res.json({ filename: req.file.originalname, content: data });

		fs.unlink(filePath, () => {});
	});
});

app.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});
