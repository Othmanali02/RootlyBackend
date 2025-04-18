require("dotenv").config();
const axios = require("axios");
const generateID = require("../../services/tools.js");

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

async function getTeamInfoA(req) {
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
		const matchingList = listInformation.find((list) => list.id === teamList);
		console.log(matchingList);
		if (matchingList) {
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
	return resBody;
}

async function createTeamA(req) {
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

	return response.data;
}

async function getUserTeamsA(req) {
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

	console.log(userObj);

	for (let team of allTeams) {
		console.log(team.fields.Leader);

		if (team.fields.Leader && team.fields.Leader[0] === userObj.id) {
			teamList.push(team);
		}

		if (team.fields["User ID"] && team.fields["User ID"].includes(userObj.id)) {
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
	return { transformedTeamList, transformedSharedList };
}

async function addMemberA(req) {
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

	return {
		userObj: matchedUser.fields,
		newMembers: response.data.fields["User ID"],
	};
}

async function removeMemberA(req) {
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

	return response.data.fields["User ID"];
}

async function removeListA(req) {
	let teamId = req.body.teamId;
	let listId = req.body.listId;
	let listBrowID = req.body.listBrowID;
	let teamLists = req.body.teamLists;

	const bRowURL1 = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamId}`;
	const response1 = await axios.get(bRowURL1, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});
	let currTeamLists = response1.data.fields.Lists;

	currTeamLists = currTeamLists.filter((item) => item !== listId);

	console.log(listId);

	console.log(currTeamLists);

	const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamId}`;
	const response = await axios.patch(
		bRowURL,
		{ fields: { Lists: currTeamLists } },
		{
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		}
	);

	return response.data.fields["Lists"];
}

async function addListsA(req) {
	let teamID = req.body.teamId;
	let chosenLists = req.body.chosenLists;

	let nextPageUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamID}`;
	const response1 = await axios.get(nextPageUrl, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	console.log(response1.data);
	let currLists = response1.data.fields.Lists;

	let updatedLists = [];

	console.log(currLists);

	console.log(chosenLists);
	if (currLists) {
		for (let i = 0; i < currLists.length; i++) {
			updatedLists.push(currLists[i]);
		}
	}
	for (let i = 0; i < chosenLists.length; i++) {
		updatedLists.push(chosenLists[i].id);
	}
	console.log(updatedLists);

	// Update the team with the new lists
	const bRowURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.teamsTable}/${teamID}`;
	const response = await axios.patch(
		bRowURL,
		{ fields: { Lists: updatedLists } },
		{
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		}
	);

	return { newLists: response.data.fields["Lists"] };
}

async function getTeamStatusA(req, teamId, UUID) {
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

	const userMatch =
		Array.isArray(team.fields["User ID"]) &&
		team.fields["User ID"].some((userId) => userId === userObj.id);

	console.log(userMatch);
	console.log(ownerMatch);

	if (teamMatch && userMatch) {
		isMember = true;
		isOwner = false;
	} else if (teamMatch && ownerMatch) {
		isOwner = true;
		isMember = false;
	}

	return { isMember, isOwner };
}

module.exports = {
	getTeamInfoA,
	createTeamA,
	getUserTeamsA,
	addMemberA,
	removeMemberA,
	getTeamStatusA,
	removeListA,
	addListsA,
};
