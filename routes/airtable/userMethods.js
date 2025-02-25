require("dotenv").config();
const genID = require("../../services/tools");

const axios = require("axios");

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

async function getUserStatusA(req, UUID) {
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
	return { isMember, isOwner };
}

async function pushCredentialsToAirtable(name, email) {
	try {
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

		const matchedUser = allUsers.find(
			(item) => item.fields.Email === email
		);
		let userID = "";

		console.log(matchedUser);

		if (matchedUser) {
			userID = matchedUser.fields["User ID"];
		} else {
			let genNewUserID = await genID();
			const req_data = {
				"User ID": genNewUserID,
				Name: name,
				Email: email,
			};

			console.log(req_data);

			const usersUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.usersTable}`;

			const response1 = await axios.post(usersUrl, req_data, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});
			userID = genNewUserID;
		}

		return userID;
	} catch (error) {
		console.log("Couldn't push to baserow", error);
	}
}

module.exports = { getUserStatusA, pushCredentialsToAirtable };
