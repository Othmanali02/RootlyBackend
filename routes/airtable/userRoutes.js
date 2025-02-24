const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const fs = require("fs");
require("dotenv").config();
const authUtils = require("../../auth-util.js");
const axios = require("axios");
const pushCredentialsToBaserow = require("../../services/services.js");
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

const userAirtableRouter = express.Router();

async function getUserByID(ownerId) {
	try {
		const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.usersTable}/?filterByFormula={User%20ID}='${ownerId}'`;

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		});

		if (response.data.records.length > 0) {
			return response.data.records[0];
		}

		return null;
	} catch (error) {
		console.error(error);
		throw new Error("Error fetching user");
	}
}

userAirtableRouter.get("/login", function (req, res, next) {
	res.redirect(authUtils.getAuthURL(OAuthClient));
});

userAirtableRouter.get("/logout", function (req, res, next) {
	res.clearCookie("token", {
		httpOnly: true,
	});
	res.clearCookie("UUID", {
		httpOnly: true,
	});

	res.status(200).json({ message: "Logged out successfully" });
});

userAirtableRouter.get(
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

userAirtableRouter.get("/user-info", async (req, res) => {
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

userAirtableRouter.get("/status/:listId", async (req, res) => {
	let UUID = req.cookies.UUID || null;

	try {
		let isMember = false;
		let isOwner = false;

		// checks if the user id exists in the list
		const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.params.listId}`;

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		});

		const list = response.data;
		const userObj = await getUserByID(UUID);

		if (list.fields.Owner && list.fields.Owner[0] === userObj.id) {
			isOwner = true;
		}

		if (!isOwner) {
			let allTeams = [];
			let nextPageUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}?size=200`;

			while (nextPageUrl) {
				try {
					const response1 = await axios.get(nextPageUrl, {
						headers: {
							Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
							"Content-Type": "application/json",
						},
					});
					allTeams = allTeams.concat(response1.data.records);
					nextPageUrl = response1.data.offset
						? `${process.env.base_url}/${process.env.teamsTable}?offset=${response1.data.offset}`
						: null;
				} catch (error) {
					console.error("Error fetching data:", error);
					break;
				}
			}

			let teamArr = allTeams;

			for (let team of teamArr) {
				let listMatch = false;
				let userMatch = false;
				if (team.fields.Lists) {
					listMatch = team.fields.Lists.some(
						(list) => list + "" === req.params.listId
					);
				}

				if (team.fields["User ID"]) {
					userMatch = team.fields["User ID"].some((user) => user === userObj.id);
				}

				if (listMatch && userMatch) {
					isMember = true;
					break;
				}
			}
		}

		console.log(isMember);
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

module.exports = userAirtableRouter;
