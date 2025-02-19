const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const { createObjectCsvWriter } = require("csv-writer");
const axios = require("axios");
const generateID = require("../services/tools.js");
const path = require("path");
const fs = require("fs");

const listRouter = express.Router();

function mapFormat(dataType) {
	const typeMap = {
		Code: "text",
		Nominal: "categorical",
		Date: "date",
		Numerical: "numeric",
		Ordinal: "categorical",
		Duration: "numeric",
		Text: "text",
	};

	return typeMap[dataType] ?? "text";
}

function mapGridscore(dataType) {
	const typeMap = {
		Code: "text",
		Nominal: "categorical",
		Date: "date",
		Numerical: "float",
		Ordinal: "categorical",
		Duration: "range",
		Text: "text",
	};

	return typeMap[dataType] ?? "text";
}

function mapJsonData(item) {
	const categories = item.scale?.validValues?.categories;
	const min = item.scale?.validValues?.minimumValue ?? 0;
	const max = item.scale?.validValues?.maximumValue ?? 99999;

	let restrictions = {};
	if (categories && categories.length > 0) {
		restrictions.categories = categories;
	} else if (min !== 0 || max !== 99999) {
		restrictions.min = min;
		restrictions.max = max;
	}

	return {
		brapiId: item.observationVariableDbId ?? "",
		name: item.observationVariableName ?? "",
		description: item.trait?.description ?? null,
		dataType: mapGridscore(item.scale?.dataType) ?? "text",
		allowRepeats: true,
		setSize: item.setSize ?? 1,
		restrictions:
			Object.keys(restrictions).length > 0 ? restrictions : undefined,
		timeframe: item.timeframe ?? null,
	};
}

function mapTsvData(item) {
	return {
		Name: item.observationVariableName ?? "",
		"Short Name": item.trait?.traitName ?? "",
		Description: item.trait?.description ?? "",
		"Data Type": mapGridscore(item.scale?.dataType) ?? "text",
		"Unit Name": item.scale?.scaleName ?? "",
		"Unit Abbreviation": item.scale?.units ?? "",
		"Unit Descriptions": item.scale?.description ?? "",
		"Trait categories": item.scale?.validValues?.categories?.join(", ") ?? "",
		Min: item.scale?.validValues?.minimumValue ?? "",
		Max: item.scale?.validValues?.maximumValue ?? "",
	};
}

function createTsvFile(listData, listName) {
	const tsvData = listData.map(mapTsvData);

	const headers = [
		"Name",
		"Short Name",
		"Description",
		"Data Type",
		"Unit Name",
		"Unit Abbreviation",
		"Unit Descriptions",
		"Trait categories",
		"Min",
		"Max",
	];

	const tsvContent = [
		headers.join("\t"), // Join headers with tab
		...tsvData.map((item) => Object.values(item).join("\t")), // Join each row's values with tab
	].join("\n");

	const filePath = path.join(__dirname, `${listName}-FieldBook.tsv`);

	return tsvContent;
}

function createJsonFile(listData, listName) {
	const jsonData = listData.map(mapJsonData);

	const filePath = path.join(__dirname, `${listName}-FieldBook.json`);

	return JSON.stringify(jsonData, null, 2); // Return JSON stringified with indentation
}

listRouter.post(
	"/create-tsv-gridscore",
	expressAsyncHandler(async (req, res) => {
		try {
			let listName = req.body.listName;
			let listData = req.body.listData;

			const tsvContent = createTsvFile(listData, listName);

			res.setHeader("Content-Type", "text/tab-separated-values");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=${listName}-Gridscore-tsv.tsv`
			);

			res.send(tsvContent);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listRouter.post(
	"/create-csv",
	expressAsyncHandler(async (req, res) => {
		try {
			let listName = req.body.listName;
			console.log(req.body.listData);

			const mappedData = req.body.listData.map((item, index) => ({
				trait: item.observationVariableName ?? null,
				format: mapFormat(item.scale?.dataType ?? "text"),
				defaultValue: item.defaultValue ?? null,
				minimum: item.scale?.validValues?.minimumValue ?? null,
				maximum: item.scale?.validValues?.maximumValue ?? null,
				details: item.trait?.description ?? null,
				categories: item.scale?.validValues?.categories ?? null,
				isVisible: true,
				realPosition: index + 1,
			}));

			const headers = [
				{ id: "trait", title: "trait" },
				{ id: "format", title: "format" },
				{ id: "defaultValue", title: "defaultValue" },
				{ id: "minimum", title: "minimum" },
				{ id: "maximum", title: "maximum" },
				{ id: "details", title: "details" },
				{ id: "categories", title: "categories" },
				{ id: "isVisible", title: "isVisible" },
				{ id: "realPosition", title: "realPosition" },
			];

			const csvWriter = createObjectCsvWriter({
				path: path.join(__dirname, `${listName}-FieldBook.csv`),
				header: headers,
			});

			csvWriter
				.writeRecords(mappedData)
				.then(() => {
					console.log("CSV file created successfully!");

					res.download(
						path.join(__dirname, `${listName}-FieldBook.csv`),
						"FieldBook.csv",
						(err) => {
							if (err) {
								console.error("Error sending the file:", err);
								res.status(500).send({ error: "Failed to send the CSV file" });
							} else {
								console.log("CSV file sent successfully");
							}
						}
					);
				})
				.catch((err) => {
					console.error("Error creating CSV:", err);
					res.status(500).send({ error: "Failed to create CSV file" });
				});
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listRouter.post(
	"/create-json-gridscore",
	expressAsyncHandler(async (req, res) => {
		try {
			let listName = req.body.listName;
			let listData = req.body.listData;

			const jsonContent = createJsonFile(listData, listName);

			res.setHeader("Content-Type", "application/json");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=${listName}-Gridscore-JSON.json`
			);

			res.send(jsonContent);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listRouter.post(
	"/getUserLists",
	expressAsyncHandler(async (req, res) => {
		try {
			let email = req.body.email;

			const bRowURL =
				"https://data.ardbase.org/api/database/rows/table/2158/?user_field_names=true";

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			const userObj = response.data.results.find(
				(item) => item.Email === email
			);

			let listInformation = [];
			let lists = userObj.Lists;

			for (let i = 0; i < userObj.Lists.length; i++) {
				const bRowURL = `https://data.ardbase.org/api/database/rows/table/2159/${lists[i].id}/?user_field_names=true`;

				const response = await axios.get(bRowURL, {
					headers: {
						Authorization: `Token ${process.env.BASEROW_TOKEN}`,
						"Content-Type": "application/json",
					},
				});
				listInformation.push(response.data);
			}

			res.status(response.status).json(listInformation);
		} catch (error) {
			console.log(error);
		}
	})
);

listRouter.post(
	"/getListInfo",
	expressAsyncHandler(async (req, res) => {
		try {
			const bRowURL =
				"https://data.ardbase.org/api/database/rows/table/2159/?user_field_names=true";

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			let items = response.data.results;

			const matchedList = items.filter(
				(item) => item["List ID"] === req.body.listId
			);

			let listName = matchedList[0].Name;
			let listBrowID = matchedList[0].id;

			// let owner = items.Owner[0].value; // compute the id of the user with another bRow request

			const bRowURL2 =
				"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true&size=200";

			const response1 = await axios.get(bRowURL2, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			let listContent = response1.data.results;

			const matchedItems = listContent.filter((item) =>
				item["List ID"].some((list) => list.value === req.body.listId)
			);

			let variableDbIds = [];
			let baserowIds = {};

			// Build a map of Variable Db Ids to baserowId
			for (let i = 0; i < matchedItems.length; i++) {
				const variableDbId = matchedItems[i]["Variable Db Id"];
				const baserowID = matchedItems[i].id;
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

listRouter.get(
	"/getLists",
	expressAsyncHandler(async (req, res) => {
		try {
			const bRowURL =
				"https://data.ardbase.org/api/database/rows/table/2159/?user_field_names=true";

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: `Token ${process.env.BASEROW_TOKEN}`,
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

listRouter.post(
	"/removeVariable",
	expressAsyncHandler(async (req, res) => {
		try {
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
			res.status(200).json({ message: "Variables Added", updatedList: response.data.result });
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listRouter.post(
	"/addVariable",
	expressAsyncHandler(async (req, res) => {
		try {
			let listId = req.body.listId;
			let traits = req.body.selectedVariables;

			const secondUrl =
				"https://data.ardbase.org/api/database/rows/table/2161/?user_field_names=true";

			for (let i = 0; i < traits.length; i++) {
				const listContentData = {
					"List Content ID": await generateID(),
					"List ID": [listId],
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
			res.status(200).json({ message: "Variables Added" });
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listRouter.post(
	"/createList",
	expressAsyncHandler(async (req, res) => {
		try {
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

			res.status(response.status).json(response.data);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

module.exports = listRouter;
