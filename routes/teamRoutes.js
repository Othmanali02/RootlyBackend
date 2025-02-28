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
	removeList,
	addLists,
} = require("./baserow/teamMethods.js");

const {
	getTeamInfoA,
	createTeamA,
	getUserTeamsA,
	addMemberA,
	removeMemberA,
	getTeamStatusA,
	removeListA,
	addListsA,
} = require("./airtable/teamMethods.js");

const teamRouter = express.Router();

let airtable = false;

teamRouter.patch(
	"/removeList",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			let newLists = null;

			if (airtable) newLists = await removeListA(req);
			else newLists = await removeList(req);

			res.status(200).json({ message: "Removed", newLists: newLists });
		} catch (error) {
			console.log(error);
		}
	})
);

teamRouter.patch(
	"/addLists",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			let response = null;

			if (airtable) {
				response = await addListsA(req);
			} else {
				response = await addLists(req);
			}

			res.status(200).json({
				newLists: response.newLists,
			});
		} catch (error) {
			console.log(error);
		}
	})
);

teamRouter.patch(
	"/removeMember",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			let newMembers = null;

			if (airtable) newMembers = await removeMemberA(req);
			else newMembers = await removeMember(req);

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
			let userObj = null;
			let newMembers = null;

			if (airtable) {
				const addA = await addMemberA(req);
				userObj = addA.userObj;
				newMembers = addA.newMembers;
			} else {
				const add = await addMember(req);
				userObj = add.userObj;
				newMembers = add.newMembers;
			}

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
			let teamList = null;
			let sharedTeams = null;
			// for baserow
			if (airtable) {
				const userTeams = await getUserTeamsA(req);
				teamList = userTeams.transformedTeamList;
				sharedTeams = userTeams.transformedSharedList;
			} else {
				const userTeams = await getUserTeams(req);
				teamList = userTeams.teamList;
				sharedTeams = userTeams.sharedTeams;
			}

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
			let resBody = null;
			if (airtable) resBody = await getTeamInfoA(req);
			else resBody = await getTeamInfo(req);

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
			let data = null;

			if (airtable) data = await createTeamA(req);
			else data = await createTeam(req);

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
		if (airtable) {
			const statusA = await getTeamStatusA(req, teamId, UUID);
			isMember = statusA.isMember;
			isOwner = statusA.isOwner;
		} else {
			const status = await getTeamStatus(req, teamId, UUID);
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

module.exports = teamRouter;
