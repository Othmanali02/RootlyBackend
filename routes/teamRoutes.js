const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const axios = require("axios");
const generateID = require("../services/tools.js");
const {
	getTeamInfo,
	createTeam,
	getUserTeams,
	addMember,
	removeMember,
	getTeamStatus,
} = require("./baserow/teamMethods.js");

const teamRouter = express.Router();

teamRouter.patch(
	"/removeMember",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			const newMembers = await removeMember(req);

			res.status(200).json({ message: "Removed", newMembers: newMembers });
		} catch (error) {
			console.log(error);
		}
	})
);

teamRouter.patch(
	"/addMember",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			const { userObj, newMembers } = await addMember(req);

			res.status(200).json({
				userObj: userObj,
				newMembers: newMembers,
			});
		} catch (error) {
			console.log(error);
		}
	})
);

teamRouter.post(
	"/getUserTeams",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			const { teamList, sharedTeams } = await getUserTeams(req);

			res.status(200).json({ teamList: teamList, sharedTeams: sharedTeams });
		} catch (error) {
			console.log(error);
		}
	})
);

teamRouter.post(
	"/getTeamInfo",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			const resBody = await getTeamInfo(req);

			res.status(200).json(resBody);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

teamRouter.post(
	"/createTeam",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			const data = await createTeam(req);

			res.status(200).json(data);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

teamRouter.get("/status/:teamId", async (req, res) => {
	let UUID = req.cookies.UUID || null;
	let teamId = req.params.teamId;

	try {
		// for baserow
		const { isMember, isOwner } = await getTeamStatus(req, teamId, UUID);

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

module.exports = teamRouter;
