const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const axios = require("axios");
const generateID = require("../../services/tools.js");

const teamAirtableRouter = express.Router();

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

async function getUserByEmail(email) {
	try {
		const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.usersTable}/?filterByFormula={Email}='${email}'`;

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

async function getUserRow(userID) {
	try {
		const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.usersTable}/${userID}`;

		const response = await axios.get(bRowURL, {
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		});

		const record = response.data;
		return {
			id: record.id,
			order: record.createdTime,
			"User ID": record.fields["User ID"],
			Name: record.fields.Name,
			Email: record.fields.Email,
			Lists: record.fields["Lists"]
				? record.fields["Lists"].map((contentId, index) => ({
						id: index + 1,
						value: contentId,
						order: index + 1,
				  }))
				: [],
		};
	} catch (error) {
		console.error(error);
		throw new Error("Error fetching user");
	}
}

teamAirtableRouter.get("/status/:teamId", async (req, res) => {
	let UUID = req.cookies.UUID || null;
	let teamId = req.params.teamId;

	try {
		let isMember = false;
		let isOwner = false;

		const airtableURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamId}`;
		const response = await axios.get(airtableURL, {
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		});

		let team = response.data;

		if (!team) {
			return res.status(404).json({ message: "Team not found" });
		}
		let userObj = await getUserByID(UUID);

		const teamMatch = team.id === teamId;

		const ownerMatch =
			team.fields["Leader"] && team.fields["Leader"][0] === userObj.id;

		const userMatch = team.fields["User ID"].some(
			(userId) => userId === userObj.id
		);

		console.log(userMatch);
		console.log(ownerMatch);

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
		res.status(500).json({ message: "An error occurred", error: err.message });
	}
});

teamAirtableRouter.patch(
	"/addMember",
	expressAsyncHandler(async (req, res) => {
		try {
			let memberEmail = req.body.memberEmail;
			let teamID = req.body.teamId;
			let teamMembers = req.body.teamMembers;
			let currTeamMembers = [];

			for (let i = 0; i < teamMembers.length; i++) {
				currTeamMembers.push(teamMembers[i]);
			}

			console.log(currTeamMembers);

			let allUsers = [];
			let nextPageUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.usersTable}`;

			while (nextPageUrl) {
				try {
					const response1 = await axios.get(nextPageUrl, {
						headers: {
							Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
							"Content-Type": "application/json",
						},
					});
					allUsers = allUsers.concat(response1.data.records);
					nextPageUrl = response1.data.offset
						? `${process.env.base_url}/Users?offset=${response1.data.offset}`
						: null;
				} catch (error) {
					console.error("Error fetching data:", error);
					break;
				}
			}

			console.log(memberEmail);

			const matchedUser = allUsers.find(
				(item) => item.fields.Email === memberEmail
			);

			if (!matchedUser) {
				return res.status(404).json({ message: "User not found" });
			}

			currTeamMembers.push(matchedUser.id);
			console.log(req.body);
			// Update the team with the new members
			const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamID}`;
			const response = await axios.patch(
				bRowURL,
				{ fields: { "User ID": currTeamMembers } },
				{
					headers: {
						Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
						"Content-Type": "application/json",
					},
				}
			);

			res.status(200).json({
				userObj: matchedUser.fields,
				newMembers: response.data.fields["User ID"],
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ message: "Internal Server Error" });
		}
	})
);

teamAirtableRouter.patch(
	"/removeMember",
	expressAsyncHandler(async (req, res) => {
		try {
			let memberID = req.body.memberID;
			let teamID = req.body.teamId;
			let teamMembers = req.body.teamMembers;
			let currTeamMembers = [];

			for (let i = 0; i < teamMembers.length; i++) {
				if (teamMembers[i] !== memberID) {
					currTeamMembers.push(teamMembers[i]);
				}
			}
			console.log(currTeamMembers);

			const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamID}`;
			const response = await axios.patch(
				bRowURL,
				{ fields: { "User ID": currTeamMembers } },
				{
					headers: {
						Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
						"Content-Type": "application/json",
					},
				}
			);

			res.status(200).json({
				message: "Removed",
				newMembers: response.data.fields["User ID"],
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ message: "Internal Server Error" });
		}
	})
);

teamAirtableRouter.post(
	"/getUserTeams",
	expressAsyncHandler(async (req, res) => {
		try {
			console.log("Yessir");
			const { userId } = req.body;

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
			let teamList = [];
			let sharedTeams = [];

			let userObj = await getUserByID(userId);

			for (let team of allTeams) {
				console.log(team.fields.Leader);

				if (team.fields.Leader && team.fields.Leader[0] === userObj.id) {
					teamList.push(team);
				}

				if (
					team.fields["User ID"] &&
					team.fields["User ID"].includes(userObj.id)
				) {
					sharedTeams.push(team);
				}
			}
			console.log(sharedTeams);
			const transformedTeamList = teamList.map((record) => {
				return {
					id: record.id,
					order: record.createdTime,
					"Team ID": record.fields["Team ID"],
					Name: record.fields.Name,
					Description: record.fields.Description,
					Leader: record.fields.Leader
						? record.fields.Leader.map((LeaderId, index) => ({
								id: LeaderId,
								value: LeaderId,
								order: index + 1,
						  }))
						: [],
					Length: record.fields.Length,
					Lists: record.fields["Lists"]
						? record.fields["Lists"].map((listID, index) => ({
								id: listID,
								value: listID,
								order: index + 1,
						  }))
						: [],
					"User ID": record.fields["User ID"]
						? record.fields["User ID"].map((userID, index) => ({
								id: userID,
								value: userID,
								order: index + 1,
						  }))
						: [],
				};
			});

			const transformedSharedList = sharedTeams.map((record) => {
				return {
					id: record.id,
					order: record.createdTime,
					"Team ID": record.fields["Team ID"],
					Name: record.fields.Name,
					Description: record.fields.Description,
					Leader: record.fields.Leader
						? record.fields.Leader.map((LeaderId, index) => ({
								id: LeaderId,
								value: LeaderId,
								order: index + 1,
						  }))
						: [],
					Length: record.fields.Length,
					Lists: record.fields["Lists"]
						? record.fields["Lists"].map((listID, index) => ({
								id: listID,
								value: listID,
								order: index + 1,
						  }))
						: [],
					"User ID": record.fields["User ID"]
						? record.fields["User ID"].map((userID, index) => ({
								id: userID,
								value: userID,
								order: index + 1,
						  }))
						: [],
				};
			});

			res.status(200).json({
				teamList: transformedTeamList,
				sharedTeams: transformedSharedList,
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ message: "Internal Server Error" });
		}
	})
);

teamAirtableRouter.post(
	"/getTeamInfo",
	expressAsyncHandler(async (req, res) => {
		try {
			const { teamId } = req.body;

			const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamId}`;
			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});

			let teamInfo = response.data.fields;
			teamInfo["id"] = response.data.id;

			let listInformation = [];
			let nextPageUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}`;

			while (nextPageUrl) {
				try {
					const response1 = await axios.get(nextPageUrl, {
						headers: {
							Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
							"Content-Type": "application/json",
						},
					});
					listInformation = listInformation.concat(response1.data.records);
					nextPageUrl = response1.data.offset
						? `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}?offset=${response1.data.offset}`
						: null;
				} catch (error) {
					console.error("Error fetching data:", error);
					break;
				}
			}
			let matchinglists = [];

			console.log(teamInfo.Lists);
			for (let teamList of teamInfo.Lists || []) {
				const matchingList = listInformation.find(
					(list) => list.id === teamList
				);
				console.log(matchingList);
				if (matchingList) {
					console.log(matchingList.fields.Owner[0]);

					let user = await getUserRow(matchingList.fields.Owner[0]);
					matchinglists.push({
						listName: matchingList.fields.Name,
						listId: matchingList.id,
						listBaserowId: matchingList.id,
						owner: user.Email,
						length: matchingList.fields.Length,
					});
				}
			}

			// Fetch members info
			let members = [];

			for (let memberId of teamInfo["User ID"] || []) {
				let user = await getUserRow(memberId);
				members.push(user);
			}

			let resBody = {
				teamInfo: teamInfo,
				lists: matchinglists,
				owner: await getUserRow(teamInfo.Leader[0]),
				members: members,
			};

			res.status(200).json(resBody);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res.status(500).json({ message: "Internal Server Error" });
		}
	})
);

teamAirtableRouter.post(
	"/createTeam",
	expressAsyncHandler(async (req, res) => {
		try {
			let teamId = await generateID();
			const { teamName, description, invitedMembers, chosenLists, userId } =
				req.body;

			let userIds = [];
			for (let email of invitedMembers) {
				let matchedUser = await getUserByEmail(email);
				if (matchedUser) {
					userIds.push(matchedUser.id);
				}
			}
			console.log(userIds);
            let userObj = await getUserByID(userId);

			let chosenListIds = chosenLists.map((list) => list.id);

			const newTeam = {
				fields: {
					"Team ID": teamId,
					Name: teamName,
					Description: description,
					Lists: chosenListIds,
					Leader: [userObj.id],
					"User ID": userIds,
				},
			};

			const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}`;
			const response = await axios.post(bRowURL, newTeam, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});

			res.status(200).json(response.data);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res.status(500).json({ message: "Internal Server Error" });
		}
	})
);

module.exports = teamAirtableRouter;
