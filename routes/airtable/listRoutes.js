const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const { createObjectCsvWriter } = require("csv-writer");
const { createObjectCsvStringifier } = require("csv-writer"); // Import the correct CSV writer
const { Readable } = require("stream");
const axios = require("axios");
const generateID = require("../../services/tools.js");
const path = require("path");
const fs = require("fs");

const listAirtableRouter = express.Router();

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

listAirtableRouter.post(
	"/getUserLists",
	expressAsyncHandler(async (req, res) => {
		try {
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
			let lists = userObj.fields.Lists;

			const airtableURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}`;

			const response = await axios.get(airtableURL, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});

			let records = response.data.records;

			for (let i = 0; i < records.length; i++) {
				if (
					records[i].fields.Owner &&
					records[i].fields.Owner[0] === userObj.id
				) {
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

			res.status(200).json(transformedListInformation);
		} catch (error) {
			console.log(error);
		}
	})
);

listAirtableRouter.get(
	"/userCustomVariables",
	expressAsyncHandler(async (req, res) => {
		try {
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
					dbListContentsData = dbListContentsData.concat(
						response1.data.records
					);
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

			res.status(200).json({
				message: "Custom Variables",
				customVariables: customVariablesArray,
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({
				message: "Error fetching custom variables",
				error: error.message,
			});
		}
	})
);

listAirtableRouter.post(
	"/getListInfo",
	expressAsyncHandler(async (req, res) => {
		try {
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
			const cropOntologyUrl = "http://127.0.0.1:5900/brapi/v2/search/variables";
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

			res.status(response.status).json(resBody);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listAirtableRouter.get(
	"/getLists",
	expressAsyncHandler(async (req, res) => {
		try {
			const airtableURL = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}`;

			const response = await axios.get(airtableURL, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});

			res.status(response.status).json(response.data);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listAirtableRouter.post(
	"/removeVariable",
	expressAsyncHandler(async (req, res) => {
		try {
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

			res.status(200).json({
				message: "Variable Removed",
				updatedList: newFields,
			});
		} catch (error) {
			console.error("Error removing variable:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listAirtableRouter.post(
	"/addVariable",
	expressAsyncHandler(async (req, res) => {
		try {
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
			res.status(200).json({ message: "Variables Added" });
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listAirtableRouter.post(
	"/addCustomVariable",
	expressAsyncHandler(async (req, res) => {
		try {
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

			res.status(200).json({
				message: "Custom Variable Added",
				baserowID: response1.data.id,
			});
		} catch (error) {
			console.error("Error adding custom variable:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listAirtableRouter.post(
	"/addMultipleCustomVariables",
	expressAsyncHandler(async (req, res) => {
		try {
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

			let newLength =
				Number(response.data.fields.Length) + chosenVariables.length;

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
			res.status(200).json({
				message: "Variables Added",
				variables: variablesAdded,
			});
		} catch (error) {
			console.error("Error adding multiple custom variables:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listAirtableRouter.post(
	"/createList",
	expressAsyncHandler(async (req, res) => {
		try {
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

			console.log(listData);

			const firstUrl = `https://api.airtable.com/v0/${process.env.base_url}/${process.env.listsTable}`;

			const response = await axios.post(firstUrl, listData, {
				headers: {
					Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
					"Content-Type": "application/json",
				},
			});

			console.log(response.data);

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

			res.status(200).json({
				message: "List Created Successfully",
				list: listsTable,
			});
		} catch (error) {
			console.error("Error creating list:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

module.exports = listAirtableRouter;
