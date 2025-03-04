const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const fs = require("fs");
require("dotenv").config();
const authUtils = require("../auth-util.js");
const axios = require("axios");
const {
	getUserStatus,
	pushCredentialsToBaserow,
} = require("./baserow/userMethods.js");
const {
	getUserStatusA,
	pushCredentialsToAirtable,
} = require("./airtable/userMethods.js");
const cookieParser = require("cookie-parser");

const discoveryUri = process.env.DISCOVERY_URI;
const redirectUri = process.env.OAUTH_REDIRECT_URI;

let airtable = false; 

if (process.env.AIRTABLE_API_KEY) {
    airtable = true; 
} else if (process.env.BASEROW_TOKEN) {
    airtable = false;
}

if (process.env.AIRTABLE_API_KEY && process.env.BASEROW_TOKEN) {
    airtable = true; 
}

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
	console.log(
		"Logging in: calling the getAuthURL function with the OAuthClient that is built using buildAuthClient"
	);
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
			console.log(
				"TOKEN EXISTS -- This is inside of /redirect in the backend, token verification worked"
			);
			console.log(token);

			try {
				if (token) {
					const { email, preferred_username, name } = token.claims();

					let newUserID = null;

					if (airtable)
						newUserID = await pushCredentialsToAirtable(name, email);
					else newUserID = await pushCredentialsToBaserow(name, email);
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
			console.log("something is very fishy - throwing a 401");

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
			console.log("attempting to verify token");
			const decoded = await authUtils.verifyToken(token, discoveryUri);
			console.log("token verified!!!");
			console.log("hi peter");

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

		// For baserow
		if (airtable) {
			const statusA = await getUserStatusA(req, UUID);
			isMember = statusA.isMember;
			isOwner = statusA.isOwner;
		} else {
			const status = await getUserStatus(req, UUID);
			isMember = status.isMember;
			isOwner = status.isOwner;
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
