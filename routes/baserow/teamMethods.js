require("dotenv").config();
const axios = require("axios");
const generateID = require("../../services/tools.js");

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

async function getTeamInfo(req) {
	const bRowURL = `https://data.ardbase.org/api/database/rows/table/2160/${req.body.teamId}/?user_field_names=true`;

	const response = await axios.get(bRowURL, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	const teamInfo = response.data;

	let allLists = [];

	let nextPageUrl =
		"https://data.ardbase.org/api/database/rows/table/2159/?user_field_names=true&size=200";

	while (nextPageUrl) {
		try {
			const response1 = await axios.get(nextPageUrl, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});
			allLists = allLists.concat(response1.data.results);
			nextPageUrl = response1.data.next;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	let listInformation = allLists;

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
	return resBody;
}

async function createTeam(req) {
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
	return response.data;
}

async function getUserTeams(req) {
	console.log(req.body.userId);
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
	return { teamList, sharedTeams };
}

async function addMember(req) {
	let memberEmail = req.body.memberEmail;
	let teamID = req.body.teamId;
	let teamMembers = req.body.teamMembers;
	let currTeamMembers = [];

	for (let i = 0; i < teamMembers.length; i++) {
		currTeamMembers.push(teamMembers[i].value);
	}

	let allUsers = [];

	let nextPageUrl =
		"https://data.ardbase.org/api/database/rows/table/2158/?user_field_names=true&size=200";

	while (nextPageUrl) {
		try {
			const response1 = await axios.get(nextPageUrl, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});
			allUsers = allUsers.concat(response1.data.results);
			nextPageUrl = response1.data.next;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	const matchedUser = allUsers.filter((item) => item["Email"] === memberEmail);

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

	const userObj = matchedUser[0];
	const newMembers = response.data["User ID"];
	return { userObj, newMembers };
}

async function removeMember(req) {
	// make sure to decode the token and make sure it is the owner that is calling this

	let memberID = req.body.memberID;
	let teamID = req.body.teamId;
	let teamMembers = req.body.teamMembers;
	let currTeamMembers = [];

	console.log(memberID);
	// console.log(teamMembers);

	for (let i = 0; i < teamMembers.length; i++) {
		if (teamMembers[i].id !== memberID) currTeamMembers.push(teamMembers[i].id);
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
	return response.data["User ID"];
}

async function getTeamStatus(req, teamId, UUID) {
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

	return { isMember, isOwner };
}

async function removeList(req) {
	let teamId = req.body.teamId;
	let listId = req.body.listId;

	console.log(req.body);
	let listBrowID = req.body.listBrowID;
	let teamLists = req.body.teamLists;
	console.log(req.body);

	const bRowURL1 = `https://data.ardbase.org/api/database/rows/table/2160/${req.body.teamId}/?user_field_names=true`;
	const response1 = await axios.get(bRowURL1, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});
	let currTeamLists = response1.data.Lists;

	console.log(currTeamLists);
	currTeamLists = currTeamLists.filter((item) => item.value !== listId);

	console.log(currTeamLists);

	let cleanedLists = [];
	for (let i = 0; i < currTeamLists.length; i++) {
		cleanedLists.push(currTeamLists[i].id);
	}

	const bRowURL = `https://data.ardbase.org/api/database/rows/table/2160/${req.body.teamId}/?user_field_names=true`;
	const response = await axios.patch(
		bRowURL,
		{ Lists: cleanedLists },
		{
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		}
	);

	return response.data["Lists"];
}

async function addLists(req) {
	let teamID = req.body.teamId;
	let chosenLists = req.body.chosenLists;

	console.log(req.body);

	const bRowURL1 = `https://data.ardbase.org/api/database/rows/table/2160/${req.body.teamId}/?user_field_names=true`;
	const response1 = await axios.get(bRowURL1, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	let currLists = response1.data.Lists;

	let updatedLists = [];

	console.log(chosenLists);
	if (currLists) {
		for (let i = 0; i < currLists.length; i++) {
			updatedLists.push(currLists[i].id);
		}
	}
	for (let i = 0; i < chosenLists.length; i++) {
		updatedLists.push(chosenLists[i].id);
	}
	console.log(updatedLists);

	// // Update the team with the new lists
	const bRowURL = `https://data.ardbase.org/api/database/rows/table/2160/${req.body.teamId}/?user_field_names=true`;
	const response = await axios.patch(
		bRowURL,
		{ Lists: updatedLists },
		{
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		}
	);

	return { newLists: response.data["Lists"] };
}

module.exports = {
	getTeamInfo,
	createTeam,
	getUserTeams,
	addMember,
	removeMember,
	getTeamStatus,
	removeList,
	addLists,
};
