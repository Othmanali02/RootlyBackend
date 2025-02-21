const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const axios = require("axios");
const generateID = require("../services/tools.js");

const teamRouter = express.Router();

async function getUserByID(ownerId) {
	try {
		const bRowURL = `https://data.ardbase.org/api/database/rows/table/2158/${ownerId}/?user_field_names=true`;

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		});
		console.log(response.data);
		return response.data;
	} catch (error) {
		console.log(error);
	}
}

teamRouter.patch(
	"/removeMember",
	expressAsyncHandler(async (req, res) => {
		try {
			// make sure to decode the token and make sure it is the owner that is calling this

			let memberID = req.body.memberID;
			let teamID = req.body.teamId;
			let teamMembers = req.body.teamMembers;
			let currTeamMembers = [];

			console.log(memberID);
			// console.log(teamMembers);

			for (let i = 0; i < teamMembers.length; i++) {
				if (teamMembers[i].id !== memberID)
					currTeamMembers.push(teamMembers[i].id);
			}

			console.log(currTeamMembers);

			const bRowURL = `https://data.ardbase.org/api/database/rows/table/2160/${teamID}/?user_field_names=true`;

			const response = await axios.patch(
				bRowURL,
				{ "User ID": currTeamMembers },
				{
					headers: {
						Authorization: `Token ${process.env.BASEROW_TOKEN}`,
						"Content-Type": "application/json",
					},
				}
			);

			console.log(response.data);

			res
				.status(200)
				.json({ message: "Removed", newMembers: response.data["User ID"] });
		} catch (error) {
			console.log(error);
		}
	})
);

teamRouter.patch(
	"/addMember",
	expressAsyncHandler(async (req, res) => {
		try {
			let memberEmail = req.body.memberEmail;
			let teamID = req.body.teamId;
			let teamMembers = req.body.teamMembers;
			let currTeamMembers = [];

			for (let i = 0; i < teamMembers.length; i++) {
				currTeamMembers.push(teamMembers[i].value);
			}

			const usersURL =
				"https://data.ardbase.org/api/database/rows/table/2158/?user_field_names=true";

			const response1 = await axios.get(usersURL, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			const matchedUser = response1.data.results.filter(
				(item) => item["Email"] === memberEmail
			);

			currTeamMembers.push(matchedUser[0]["User ID"]);

			const bRowURL = `https://data.ardbase.org/api/database/rows/table/2160/${teamID}/?user_field_names=true`;

			const response = await axios.patch(
				bRowURL,
				{ "User ID": currTeamMembers },
				{
					headers: {
						Authorization: `Token ${process.env.BASEROW_TOKEN}`,
						"Content-Type": "application/json",
					},
				}
			);

			// add logic to send an email to the client with the invite

			res.status(200).json({
				userObj: matchedUser[0],
				newMembers: response.data["User ID"],
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
			console.log(req.body.userId);

			const bRowURL = `https://data.ardbase.org/api/database/rows/table/2160/?user_field_names=true`;

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			let teamArr = response.data.results;
			let teamList = [];
			let sharedTeams = [];

			for (let i = 0; i < teamArr.length; i++) {
				if (teamArr[i]["Leader"].length > 0) {
					if (teamArr[i]["Leader"][0].value === req.body.userId) {
						teamList.push(teamArr[i]);
					}
				}

				if (teamArr[i]["User ID"].length > 0) {
					let usersArry = teamArr[i]["User ID"];
					for (let j = 0; j < usersArry.length; j++) {
						console.log(usersArry[j]["value"]);

						if (usersArry[j]["value"] === req.body.userId) {
							sharedTeams.push(teamArr[i]);
						}
					}
				}
			}
			console.log(sharedTeams);
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
			const bRowURL = `https://data.ardbase.org/api/database/rows/table/2160/${req.body.teamId}/?user_field_names=true`;

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			const teamInfo = response.data;

			const bRowURL2 =
				"https://data.ardbase.org/api/database/rows/table/2159/?user_field_names=true";

			const response1 = await axios.get(bRowURL2, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			let listInformation = response1.data.results;

			let teamLists = teamInfo.Lists;
			console.log(teamInfo);
			let matchinglists = [];

			for (let teamList of teamLists) {
				const matchingList = listInformation.find(
					(list) => list["List ID"] === teamList.value
				);

				if (matchingList) {
					let user = await getUserByID(matchingList.Owner[0].id);

					matchinglists.push({
						listName: matchingList.Name,
						listId: matchingList["List ID"],
						listBaserowId: matchingList.id,
						owner: user.Email,
						length: matchingList["Length"],
					});
				}
			}

			// console.log(teamInfo.Leader);
			// console.log(teamInfo["User ID"]);

			let members = [];

			for (let i = 0; i < teamInfo["User ID"].length; i++) {
				members.push(await getUserByID(teamInfo["User ID"][i].id));
			}
			console.log(members);
			let resBody = {
				teamInfo: teamInfo,
				lists: matchinglists,
				owner: await getUserByID(teamInfo.Leader[0].id),
				members: members,
			};

			res.status(response.status).json(resBody);
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
			let teamId = await generateID();

			// const req_dat2a = {
			// 	"List ID": teamId,
			// 	Name: req.body.listName,
			// 	Owner: [req.body.userId],
			// 	Length: requestData.traits.length,
			// };

			const usersURL =
				"https://data.ardbase.org/api/database/rows/table/2158/?user_field_names=true";

			const response1 = await axios.get(usersURL, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			let users = response1.data.results;

			let invitedMembers = req.body.invitedMembers;

			let userIds = [];
			for (let i = 0; i < invitedMembers.length; i++) {
				let matchedUser = users.filter(
					(item) => item["Email"] === invitedMembers[i]
				);
				userIds.push(matchedUser[0]["User ID"]);
			}

			let chosenLists = req.body.chosenLists.map((list) => list["List ID"]);

			const req_data = {
				"Team ID": teamId,
				Name: req.body.teamName,
				Description: req.body.description,
				Lists: chosenLists,
				Leader: [req.body.userId],
				"User ID": userIds,
			};

			console.log(req_data);

			const teamsURL =
				"https://data.ardbase.org/api/database/rows/table/2160/?user_field_names=true";

			const response = await axios.post(teamsURL, req_data, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			// Creating the lsit content in the list content table

			res.status(200).json(response.data);
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
		let isMember = false;
		let isOwner = false;

		const bRowURL1 = `https://data.ardbase.org/api/database/rows/table/2160/${req.params.teamId}/?user_field_names=true`;

		const response1 = await axios.get(bRowURL1, {
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		});
		let team = response1.data;

		const teamMatch = team.id + "" === teamId;

		const ownerMatch = team["Leader"][0].value === UUID;
		console.log(ownerMatch);

		const userMatch = team["User ID"].some((user) => user.value === UUID);

		console.log(team.Name);
		console.log(ownerMatch);
		console.log(userMatch);
		console.log(teamMatch);

		if (teamMatch && userMatch) {
			isMember = true;
			isOwner = false;
		} else if (teamMatch && ownerMatch) {
			isOwner = true;
			isMember = false;
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
