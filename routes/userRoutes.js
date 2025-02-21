const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const fs = require("fs");
require("dotenv").config();
const authUtils = require("../auth-util.js");
const axios = require("axios");
const pushCredentialsToBaserow = require("../services/services.js");
const cookieParser = require("cookie-parser");

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

const userRouter = express.Router();

userRouter.get("/login", function (req, res, next) {
	res.redirect(authUtils.getAuthURL(OAuthClient));
});

userRouter.get("/logout", function (req, res, next) {
	res.clearCookie("token", {
		httpOnly: true,
	});
	res.clearCookie("UUID", {
		httpOnly: true,
	});

	res.status(200).json({ message: "Logged out successfully" });
});

userRouter.get(
	"/redirect",
	expressAsyncHandler(async function (req, res, next) {
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
					res.setHeader(
						"Access-Control-Allow-Methods",
						"GET, POST, PUT, DELETE"
					);
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
	})
);

userRouter.get("/user-info", async (req, res) => {
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

userRouter.get("/status/:listId", async (req, res) => {
	let UUID = req.cookies.UUID || null;

	try {
		let isMember = false;
		let isOwner = false;

		// checks if the user id exists in the list
		const bRowURL = `https://data.ardbase.org/api/database/rows/table/2159/${req.params.listId}/?user_field_names=true`;

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		const list = response.data;

		if (list.Owner[0].value === UUID) isOwner = true;

		if (!isOwner) {
			// checks if the user exists in a team that has that list in it
			let allTeams = [];

			let nextPageUrl =
				"https://data.ardbase.org/api/database/rows/table/2160/?user_field_names=true&size=200";

			while (nextPageUrl) {
				try {
					const response1 = await axios.get(nextPageUrl, {
						headers: {
							Authorization: `Token ${process.env.BASEROW_TOKEN}`,
							"Content-Type": "application/json",
						},
					});
					allTeams = allTeams.concat(response1.data.results);
					nextPageUrl = response1.data.next;
				} catch (error) {
					console.error("Error fetching data:", error);
					break;
				}
			}

			let teamArr = allTeams;

			for (let team of teamArr) {
				const listMatch = team.Lists.some(
					(list) => list.id + "" === req.params.listId
				);

				const userMatch = team["User ID"].some((user) => user.value === UUID);
				if (listMatch && userMatch) {
					isMember = true;
					break;
				}
			}
		}

		if (isOwner && !isMember) {
			res.json({
				isOwner: true,
				isMember: false,
			});
		} else if (!isOwner && isMember) {
			res.json({
				isOwner: false,
				isMember: true,
			});
		} else {
			res.json({
				isOwner: false,
				isMember: false,
			});
		}
	} catch (err) {
		console.log(err);
	}
});

module.exports = userRouter;
