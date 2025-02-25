require("dotenv").config();
const axios = require("axios");

async function getUserStatus(req, UUID) {
	let isMember = false;
	let isOwner = false;

	// checks if the user id exists in the list
	const bRowURL = `https://data.ardbase.org/api/database/rows/table/2159/${req.params.listId}/?user_field_names=true`;

	const response = await axios.get(bRowURL, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	const list = response.data;

	if (list.Owner[0].value === UUID) isOwner = true;

	if (!isOwner) {
		// checks if the user exists in a team that has that list in it
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

		for (let team of teamArr) {
			const listMatch = team.Lists.some(
				(list) => list.id + "" === req.params.listId
			);

			const userMatch = team["User ID"].some((user) => user.value === UUID);
			if (listMatch && userMatch) {
				isMember = true;
				break;
			}
		}
	}
	return { isMember, isOwner };
}

module.exports = { getUserStatus };
