const genID = require("./tools");
const axios = require("axios");

async function pushCredentialsToBaserow(name, email) {
	try {
		const getusers =
			"https://data.ardbase.org/api/database/rows/table/2158/?user_field_names=true";

		const response = await axios.get(getusers, {
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		let userID = "";

		const matchItem = response.data.results.find(
			(item) => item.Email === email
		);

		if (matchItem) {
			userID = matchItem["User ID"];
		} else {
			let genNewUserID = await genID();
			const req_data = {
				"User ID": genNewUserID,
				Name: name,
				Email: email,
			};

			console.log(req_data);

			const usersUrl =
				"https://data.ardbase.org/api/database/rows/table/2158/?user_field_names=true";

			const response1 = await axios.post(usersUrl, req_data, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});
			console.log(response1);
			userID = genNewUserID;
		}

		console.log(userID);
		return userID;
	} catch (error) {
		console.log("Couldn't push to baserow", error);
	}
}

module.exports = pushCredentialsToBaserow;
