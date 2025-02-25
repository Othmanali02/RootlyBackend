require("dotenv").config();
const axios = require("axios");
const generateID = require("../../services/tools.js");

async function getUserLists(req) {
	let email = req.body.email;
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

	console.log(allUsers);
	const userObj = allUsers.find((item) => item.Email === email);

	let listInformation = [];

	let nextPageUrl1 =
		"https://data.ardbase.org/api/database/rows/table/2159/?user_field_names=true&size=200";

	while (nextPageUrl1) {
		try {
			const response1 = await axios.get(nextPageUrl1, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});
			listInformation = listInformation.concat(response1.data.results);
			nextPageUrl1 = response1.data.next;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	console.log(listInformation);
	let userLists = [];

	for (let i = 0; i < listInformation.length; i++) {
		if (listInformation[i].Owner[0].id === userObj.id) {
			userLists.push(listInformation[i]);
		}
		// listInformation.push(response.data);
	}
	return userLists;
}

async function getListInfo(req) {
	const bRowURL = `https://data.ardbase.org/api/database/rows/table/2159/${req.body.listId}/?user_field_names=true`;

	const response = await axios.get(bRowURL, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	const matchedList = response.data;
	console.log(matchedList);
	let listName = matchedList.Name;
	let listBrowID = matchedList.id;
	console.log(listName);
	console.log(listBrowID);

	let listContent = [];

	let nextPageUrl =
		"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true&size=200";

	while (nextPageUrl) {
		try {
			const response1 = await axios.get(nextPageUrl, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});
			listContent = listContent.concat(response1.data.results);
			nextPageUrl = response1.data.next;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	console.log(listContent[0]["List ID"]);

	const matchedItems = listContent.filter((item) =>
		item["List ID"].some((list) => list.id + "" === req.body.listId)
	);
	console.log(matchedItems);
	let variableDbIds = [];
	let customVariables = [];
	let baserowIds = {};

	// Build a map of Variable Db Ids to baserowId
	for (let i = 0; i < matchedItems.length; i++) {
		const variableDbId = matchedItems[i]["Variable Db Id"];
		const baserowID = matchedItems[i].id;
		if (matchedItems[i]["Custom Variables"])
			customVariables.push({
				cropOntologyData: matchedItems[i]["Custom Variables"],
				baserowID: matchedItems[i].id,
			});
		variableDbIds.push(variableDbId);
		baserowIds[variableDbId] = baserowID; // Map each variableDbId to its corresponding baserowID
	}

	const cropOntologyUrl = "http://127.0.0.1:5900/brapi/v2/search/variables";
	const reqBody = {
		observationVariableDbIds: variableDbIds,
	};

	console.log(reqBody);

	let finalRes = [];
	const response2 = await axios.post(cropOntologyUrl, reqBody);

	for (let i = 0; i < response2.data.result.length; i++) {
		const cropData = response2.data.result[i];
		const observationVariableDbId = cropData.observationVariableDbId;

		if (baserowIds.hasOwnProperty(observationVariableDbId)) {
			finalRes.push({
				cropOntologyData: cropData,
				baserowID: baserowIds[observationVariableDbId],
			});
		}
	}

	let resBody = {
		listName: listName,
		items: finalRes,
		listBrowID: listBrowID,
		customVariables: customVariables,
	};
	return resBody;
}

async function addVariable(req) {
	let listId = req.body.listId;
	let traits = req.body.selectedVariables;

	const secondUrl =
		"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true";

	for (let i = 0; i < traits.length; i++) {
		const listContentData = {
			"List Content ID": await generateID(),
			"List ID": [Number(listId)],
			"List Name": req.body.listName, // this is a redundancy in the database design
			// but it will save one request on multiple pages that's why it exists
			"Variable Db Id": traits[i].observationVariableDbId,
		};

		console.log(listContentData);

		const response1 = await axios.post(secondUrl, listContentData, {
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		console.log(response1);
	}

	const getRow = `https://data.ardbase.org/api/database/rows/table/2159/${req.body.listBrowID}/?user_field_names=true`;

	const response = await axios.get(getRow, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	let newLength = Number(response.data.Length) + traits.length;

	const patchRow = `https://data.ardbase.org/api/database/rows/table/2159/${req.body.listBrowID}/?user_field_names=true`;

	const response1 = await axios.patch(
		patchRow,
		{
			Length: newLength + "",
		},
		{
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		}
	);

	console.log(response1.data);
}

async function removeVariable(req) {
	let listBrowID = req.body.listBrowID;
	let listContentBrowID = req.body.listContentBrowID;

	const delRow = `https://data.ardbase.org/api/database/rows/table/2161/${listContentBrowID}/?user_field_names=true`;

	const deleteResponse = await axios.delete(delRow, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	const getRow = `https://data.ardbase.org/api/database/rows/table/2159/${listBrowID}/?user_field_names=true`;

	const response = await axios.get(getRow, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	let newLength = Number(response.data.Length) - 1;

	const patchRow = `https://data.ardbase.org/api/database/rows/table/2159/${listBrowID}/?user_field_names=true`;

	const response1 = await axios.patch(
		patchRow,
		{
			Length: newLength + "",
		},
		{
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		}
	);

	console.log(response1.data);
	return response.data.results;
}

async function addCustomVariable(req) {
	let listId = req.body.listId;
	let listBrowID = req.body.listBrowID;
	let userInput = req.body.userInput;

	const secondUrl =
		"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true";

	const listContentData = {
		"List Content ID": await generateID(),
		"List ID": [Number(listId)],
		"List Name": req.body.listName,
		"Custom Variables": JSON.stringify(userInput),
	};

	console.log(listContentData);
	const listContentResponse = await axios.post(secondUrl, listContentData, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	console.log(listContentResponse.data);

	const getRow = `https://data.ardbase.org/api/database/rows/table/2159/${listBrowID}/?user_field_names=true`;

	const response = await axios.get(getRow, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	let newLength = Number(response.data.Length) + 1;

	const patchRow = `https://data.ardbase.org/api/database/rows/table/2159/${listBrowID}/?user_field_names=true`;

	const response1 = await axios.patch(
		patchRow,
		{
			Length: newLength + "",
		},
		{
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		}
	);
	return listContentResponse.data.id;
}

async function addMultipleCustomVariables(req) {
	let listId = req.body.listId;
	let listBrowID = req.body.listBrowID;
	let chosenVariables = req.body.chosenVariables;
	let variablesAdded = [];

	for (let i = 0; i < chosenVariables.length; i++) {
		const secondUrl =
			"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true";

		const listContentData = {
			"List Content ID": await generateID(),
			"List ID": [Number(listId)],
			"List Name": req.body.listName,
			"Custom Variables": JSON.stringify(chosenVariables[i]),
		};

		const listContentResponse = await axios.post(secondUrl, listContentData, {
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		variablesAdded.push({
			baserowID: listContentResponse.data.id,
			listContentData: chosenVariables[i],
		});
	}

	const getRow = `https://data.ardbase.org/api/database/rows/table/2159/${listBrowID}/?user_field_names=true`;

	const response = await axios.get(getRow, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	let newLength = Number(response.data.Length) + chosenVariables.length;

	const patchRow = `https://data.ardbase.org/api/database/rows/table/2159/${listBrowID}/?user_field_names=true`;

	const response1 = await axios.patch(
		patchRow,
		{
			Length: newLength + "",
		},
		{
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		}
	);

	return variablesAdded;
}

async function createList(req) {
	const requestData = req.body;

	console.log(requestData);

	let listId = await generateID();
	let traits = requestData.traits;

	const req_data = {
		"List ID": listId,
		Name: req.body.listName,
		Owner: [req.body.userId],
		Length: requestData.traits.length,
	};

	console.log(req_data);
	// Creating the list in the list table

	const firstUrl =
		"https://data.ardbase.org/api/database/rows/table/2159/?user_field_names=true";

	const response = await axios.post(firstUrl, req_data, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	// Creating the lsit content in the list content table

	const secondUrl =
		"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true";

	for (let i = 0; i < requestData.traits.length; i++) {
		const listContentData = {
			"List Content ID": await generateID(),
			"List ID": [listId],
			"List Name": req.body.listName, // this is a redundancy in the database design
			// but it will save one request on multiple pages that's why it exists
			"Variable Db Id": traits[i].observationVariableDbId,
		};

		const response1 = await axios.post(secondUrl, listContentData, {
			headers: {
				Authorization: `Token ${process.env.BASEROW_TOKEN}`,
				"Content-Type": "application/json",
			},
		});
		console.log(response1);
	}

	return response.data;
}

async function getUserCustomVariables(req) {
	console.log("Custom variables for this user !!", req.cookies.UUID);

	// should be able to paginate if the number of rows is exceeded

	const bRowURL =
		"https://data.ardbase.org/api/database/rows/table/2159/?user_field_names=true&size=200";

	const response = await axios.get(bRowURL, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	const userLists = response.data.results.filter(
		(item) => item.Owner[0].value === req.cookies.UUID
	);

	const allListContents = userLists.map((item) => item["List-Content"]).flat();

	const bRowURL1 =
		"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true&size=200";

	const response1 = await axios.get(bRowURL1, {
		headers: {
			Authorization: `Token ${process.env.BASEROW_TOKEN}`,
			"Content-Type": "application/json",
		},
	});

	const dbListContents = response1.data.results;
	const customVariablesArray = [
		...new Set(
			allListContents
				.filter((content) =>
					dbListContents.some(
						(dbContent) =>
							dbContent.id === content.id &&
							dbContent["List Content ID"] === content.value
					)
				)
				.map((content) => {
					const matchedDbContent = dbListContents.find(
						(dbContent) =>
							dbContent.id === content.id &&
							dbContent["List Content ID"] === content.value
					);
					return matchedDbContent ? matchedDbContent["Custom Variables"] : null;
				})
				.filter((customVariable) => customVariable && customVariable !== "")
		),
	];
	console.log(customVariablesArray);
	return customVariablesArray;
}

module.exports = {
	getUserLists,
	getListInfo,
	addVariable,
	removeVariable,
	addCustomVariable,
	addMultipleCustomVariables,
	createList,
	getUserCustomVariables,
};
