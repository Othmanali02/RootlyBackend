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

async function getUserListsA(req) {
	let email = req.body.email;
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
				? `${nextPageUrl}&offset=${response1.data.offset}`
				: null;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	const userObj = allUsers.find((item) => item.fields.Email === email);
	let listInformation = [];

	const airtableURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}`;

	const response = await axios.get(airtableURL, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	let records = response.data.records;

	for (let i = 0; i < records.length; i++) {
		if (records[i].fields.Owner && records[i].fields.Owner[0] === userObj.id) {
			listInformation.push(records[i]);
		}
	}
	const transformedListInformation = listInformation.map((record) => {
		return {
			id: record.id,
			order: record.createdTime,
			"List ID": record.fields["List ID"],
			Name: record.fields.Name,
			Owner: record.fields.Owner
				? record.fields.Owner.map((ownerId, index) => ({
						id: ownerId,
						value: ownerId,
						order: index + 1,
				  }))
				: [],
			Length: record.fields.Length,
			"List-Content": record.fields["List-Content"]
				? record.fields["List-Content"].map((contentId, index) => ({
						id: index + 1,
						value: contentId,
						order: index + 1,
				  }))
				: [],
			"Team ID": [],
		};
	});
	return transformedListInformation;
}

async function getListInfoA(req) {
	const airtableURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.body.listId}`;
	const response = await axios.get(airtableURL, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	const matchedList = response.data;
	let listName = matchedList.fields.Name;
	let listBrowID = matchedList.id;

	let listContent = [];

	let nextPageUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}`;

	while (nextPageUrl) {
		try {
			const response1 = await axios.get(nextPageUrl, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});
			listContent = listContent.concat(response1.data.records);
			nextPageUrl = response1.data.offset
				? `${nextPageUrl}&offset=${response1.data.offset}`
				: null;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	const matchedItems = listContent.filter((item) =>
		item.fields["List ID"].some((list) => list + "" === req.body.listId)
	);

	let variableDbIds = [];
	let customVariables = [];
	let airtableIds = {};

	for (let i = 0; i < matchedItems.length; i++) {
		const variableDbId = matchedItems[i].fields["Variable Db Id"];
		const airtableID = matchedItems[i].id;
		if (matchedItems[i].fields["Custom Variables"])
			customVariables.push({
				cropOntologyData: matchedItems[i].fields["Custom Variables"],
				baserowID: matchedItems[i].id,
			});
		variableDbIds.push(variableDbId);
		airtableIds[variableDbId] = airtableID;
	}
	const cropOntologyUrl = "http://cropontology:5900/brapi/v2/search/variables";
	const reqBody = {
		observationVariableDbIds: variableDbIds,
	};

	let finalRes = [];
	const response2 = await axios.post(cropOntologyUrl, reqBody);

	for (let i = 0; i < response2.data.result.length; i++) {
		const cropData = response2.data.result[i];
		const observationVariableDbId = cropData.observationVariableDbId;

		if (airtableIds.hasOwnProperty(observationVariableDbId)) {
			finalRes.push({
				cropOntologyData: cropData,
				baserowID: airtableIds[observationVariableDbId],
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

async function addVariableA(req) {
	console.log(req.body);
	let traits = req.body.selectedVariables;
	const airtableUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}`;

	for (let i = 0; i < traits.length; i++) {
		const listContentData = {
			fields: {
				"List Content ID": await generateID(),
				"List ID": [req.body.listBrowID],
				"List Name": req.body.listName,
				"Variable Db Id": traits[i].observationVariableDbId,
			},
		};

		console.log(listContentData);

		const response1 = await axios.post(airtableUrl, listContentData, {
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		});

		console.log(response1.data);
	}

	const getRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.body.listBrowID}`;

	const response = await axios.get(getRowUrl, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	let newLength = Number(response.data.fields.Length) + traits.length;

	const patchRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.body.listBrowID}`;

	const response1 = await axios.patch(
		patchRowUrl,
		{
			fields: {
				Length: newLength + "",
			},
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		}
	);

	console.log(response1.data);
}

async function removeVariableA(req) {
	const { listBrowID, listContentBrowID } = req.body;

	const airtableUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}/${listContentBrowID}`;

	const delResponse = await axios.delete(airtableUrl, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	const getRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.body.listBrowID}`;

	const response = await axios.get(getRowUrl, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	let newFields = response.data.fields;
	newFields["id"] = response.data.id;

	let newLength = Number(response.data.fields.Length) - 1;

	const patchRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.body.listBrowID}`;

	const response1 = await axios.patch(
		patchRowUrl,
		{
			fields: {
				Length: newLength + "",
			},
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		}
	);

	return newFields;
}

async function addCustomVariableA(req) {
	const { listId, listBrowID, userInput, listName } = req.body;

	const listContentData = {
		fields: {
			"List Content ID": await generateID(),
			"List ID": [listId],
			"List Name": listName,
			"Custom Variables": JSON.stringify(userInput),
		},
	};

	const airtableUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}`;

	const response1 = await axios.post(airtableUrl, listContentData, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	const getRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${listBrowID}`;

	const response = await axios.get(getRowUrl, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	let newLength = Number(response.data.fields.Length) + 1;

	const patchRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${listBrowID}`;

	const response2 = await axios.patch(
		patchRowUrl,
		{
			fields: {
				Length: newLength + "",
			},
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		}
	);
	return response1.data.id;
}

async function addMultipleCustomVariablesA(req) {
	const { listId, listBrowID, chosenVariables, listName } = req.body;
	let variablesAdded = [];

	const airtableUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}`;

	for (let i = 0; i < chosenVariables.length; i++) {
		const listContentData = {
			fields: {
				"List Content ID": await generateID(),
				"List ID": [listId],
				"List Name": listName,
				"Custom Variables": JSON.stringify(chosenVariables[i]),
			},
		};

		const response1 = await axios.post(airtableUrl, listContentData, {
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		});

		variablesAdded.push({
			baserowID: response1.data.id,
			listContentData: chosenVariables[i],
		});
	}

	const getRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.body.listBrowID}`;

	const response = await axios.get(getRowUrl, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	let newLength = Number(response.data.fields.Length) + chosenVariables.length;

	const patchRowUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}/${req.body.listBrowID}`;

	const response1 = await axios.patch(
		patchRowUrl,
		{
			fields: {
				Length: newLength + "",
			},
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		}
	);
	return variablesAdded;
}

async function createListA(req) {
	const { listName, userId, traits } = req.body;
	const listId = await generateID();
	let userAirtableID = await getUserByID(userId);
	const listData = {
		fields: {
			"List ID": listId,
			Name: listName,
			Owner: [userAirtableID.id],
			Length: traits.length + "",
		},
	};

	const firstUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}`;

	const response = await axios.post(firstUrl, listData, {
		headers: {
			Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
			"Content-Type": "application/json",
		},
	});

	let listsTable = response.data.fields;
	listsTable["id"] = response.data.id;

	const secondUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}`;

	for (let i = 0; i < traits.length; i++) {
		const listContentData = {
			fields: {
				"List Content ID": await generateID(),
				"List ID": [listsTable.id],
				"List Name": listName,
				"Variable Db Id": traits[i].observationVariableDbId,
			},
		};

		const response1 = await axios.post(secondUrl, listContentData, {
			headers: {
				Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
		});
		console.log(response1.data);
	}

	return listsTable;
}

async function getUserCustomVariablesA(req) {
	console.log("Custom variables for this user !!", req.cookies.UUID);

	let nextPageUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}`;
	let allLists = [];

	while (nextPageUrl) {
		try {
			const response1 = await axios.get(nextPageUrl, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});
			allLists = allLists.concat(response1.data.records);
			nextPageUrl = response1.data.offset
				? `${process.env.base_url}/Users?offset=${response1.data.offset}`
				: null;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	let userObj = await getUserByID(req.cookies.UUID);

	const userLists = allLists.filter(
		(item) => item.fields.Owner && item.fields.Owner[0] === userObj.id
	);
	console.log(userLists);

	const allListContents = userLists
		.map((item) => item.fields["List-Content"])
		.flat();
	console.log(allListContents);

	let nextPageUrl2 = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}`;
	let dbListContentsData = [];

	while (nextPageUrl2) {
		try {
			const response1 = await axios.get(nextPageUrl2, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});
			dbListContentsData = dbListContentsData.concat(response1.data.records);
			nextPageUrl2 = response1.data.offset
				? `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listContentTable}?offset=${response1.data.offset}`
				: null;
		} catch (error) {
			console.error("Error fetching data:", error);
			break;
		}
	}

	const customVariablesArray = [
		...new Set(
			allListContents
				.filter((content) =>
					dbListContentsData.some((dbContent) => dbContent.id === content)
				)
				.map((content) => {
					const matchedDbContent = dbListContentsData.find(
						(dbContent) => dbContent.id === content
					);
					return matchedDbContent
						? matchedDbContent.fields["Custom Variables"]
						: null;
				})
				.filter((customVariable) => customVariable && customVariable !== "")
		),
	];

	console.log(customVariablesArray);
	return customVariablesArray;
}

module.exports = {
	getUserListsA,
	getListInfoA,
	addVariableA,
	removeVariableA,
	addCustomVariableA,
	addMultipleCustomVariablesA,
	createListA,
	getUserCustomVariablesA,
};
