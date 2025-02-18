const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const axios = require("axios");
const generateID = require("../services/tools.js");

const teamRouter = express.Router();

async function getUserByID(ownerId) {
	try {
		const bRowURL = `https://portal.ardbase.org/api/database/rows/table/675/${ownerId}/?user_field_names=true`;

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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

			const bRowURL = `https://portal.ardbase.org/api/database/rows/table/678/${teamID}/?user_field_names=true`;

			const response = await axios.patch(
				bRowURL,
				{ "User ID": currTeamMembers },
				{
					headers: {
						Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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
				"https://portal.ardbase.org/api/database/rows/table/675/?user_field_names=true";

			const response1 = await axios.get(usersURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			const matchedUser = response1.data.results.filter(
				(item) => item["Email"] === memberEmail
			);

			currTeamMembers.push(matchedUser[0]["User ID"]);

			const bRowURL = `https://portal.ardbase.org/api/database/rows/table/678/${teamID}/?user_field_names=true`;

			const response = await axios.patch(
				bRowURL,
				{ "User ID": currTeamMembers },
				{
					headers: {
						Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
						"Content-Type": "application/json",
					},
				}
			);

			// add logic to send an email to the client with the invite

			res
				.status(200)
				.json({
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

			const bRowURL = `https://portal.ardbase.org/api/database/rows/table/678/?user_field_names=true`;

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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
			const bRowURL =
				"https://portal.ardbase.org/api/database/rows/table/678/?user_field_names=true";

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			let items = response.data.results;

			const matchedTeam = items.filter(
				(item) => item["Team ID"] === req.body.teamId
			);

			const teamInfo = matchedTeam[0];

			const bRowURL2 =
				"https://portal.ardbase.org/api/database/rows/table/676/?user_field_names=true&size=200";

			const response1 = await axios.get(bRowURL2, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			let listInformation = response1.data.results;

			let teamLists = matchedTeam[0].Lists;
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
						owner: user.Email,
						length: matchingList["Length"],
					});
				}
			}

			// console.log(matchedTeam[0].Leader);
			// console.log(matchedTeam[0]["User ID"]);

			let members = [];

			for (let i = 0; i < matchedTeam[0]["User ID"].length; i++) {
				members.push(await getUserByID(matchedTeam[0]["User ID"][i].id));
			}
			console.log(members);
			let resBody = {
				teamInfo: teamInfo,
				lists: matchinglists,
				owner: await getUserByID(matchedTeam[0].Leader[0].id),
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
				"https://portal.ardbase.org/api/database/rows/table/675/?user_field_names=true";

			const response1 = await axios.get(usersURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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
				"https://portal.ardbase.org/api/database/rows/table/678/?user_field_names=true";

			const response = await axios.post(teamsURL, req_data, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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

module.exports = teamRouter;
