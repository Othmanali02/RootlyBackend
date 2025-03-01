const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const { createObjectCsvWriter } = require("csv-writer");
const { createObjectCsvStringifier } = require("csv-writer"); // Import the correct CSV writer
const { Readable } = require("stream");
const axios = require("axios");
const generateID = require("../services/tools.js");
const path = require("path");
const fs = require("fs");
const {
	getUserLists,
	getListInfo,
	addVariable,
	removeVariable,
	addCustomVariable,
	addMultipleCustomVariables,
	createList,
	getUserCustomVariables,
	removeUserList,
} = require("./baserow/listMethods.js");

const {
	getUserListsA,
	getListInfoA,
	addVariableA,
	removeVariableA,
	addCustomVariableA,
	addMultipleCustomVariablesA,
	createListA,
	getUserCustomVariablesA,
	removeUserListA,
} = require("./airtable/listMethods.js");

const listRouter = express.Router();

if (process.env.AIRTABLE_API_KEY) {
	airtable = true;
} else if (process.env.BASEROW_TOKEN) {
	airtable = false;
}

if (process.env.AIRTABLE_API_KEY && process.env.BASEROW_TOKEN) {
	airtable = true;
}
function mapFormat(dataType) {
    const normalizedType = (dataType || "").trim().toLowerCase();

    const typeMap = {
        code: "text",
        nominal: "categorical",
        date: "date",
        numerical: "numeric",
        numeric: "numeric",
        ordinal: "categorical",
        duration: "numeric",
        text: "text",
        percent: "percent",
        categorical: "categorical",
        boolean: "boolean",
        photo: "photo",
        counter: "counter",
        multicat: "multicat",
        audio: "audio",
        location: "location"
    };

    return typeMap[normalizedType] ?? "text";
}


function mapJsonData(item) {
	const categories = item.cropOntologyData.scale?.validValues?.categories;
	const min = item.cropOntologyData.scale?.validValues?.minimumValue ?? 0;
	const max = item.cropOntologyData.scale?.validValues?.maximumValue ?? 99999;

	let restrictions = {};
	if (categories && categories.length > 0) {
		restrictions.categories = categories;
	} else if (min !== 0 || max !== 99999) {
		restrictions.min = min;
		restrictions.max = max;
	}

	return {
		brapiId: item.cropOntologyData.observationVariableDbId ?? "",
		name: item.cropOntologyData.observationVariableName ?? "",
		description: item.cropOntologyData.trait?.description ?? null,
		dataType: mapFormat(item.cropOntologyData.scale?.dataType) ?? "text",
		allowRepeats: true,
		setSize: item.cropOntologyData.setSize ?? 1,
		restrictions:
			Object.keys(restrictions).length > 0 ? restrictions : undefined,
		timeframe: item.cropOntologyData.timeframe ?? null,
	};
}

function mapTsvData(item) {
	return {
		Name: item.cropOntologyData.observationVariableName ?? "",
		"Short Name": item.cropOntologyData.trait?.traitName ?? "",
		Description: item.cropOntologyData.trait?.description ?? "",
		"Data Type": mapFormat(item.cropOntologyData.scale?.dataType) ?? "text",
		"Unit Name": item.cropOntologyData.scale?.scaleName ?? "",
		"Unit Abbreviation": item.cropOntologyData.scale?.units ?? "",
		"Unit Descriptions": item.cropOntologyData.scale?.description ?? "",
		"Trait categories":
			item.cropOntologyData.scale?.validValues?.categories?.join(", ") ?? "",
		Min: item.cropOntologyData.scale?.validValues?.minimumValue ?? "",
		Max: item.cropOntologyData.scale?.validValues?.maximumValue ?? "",
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
		"Trait categories (comma separated)",
		"Min (only for numeric traits)",
		"Max (only for numeric traits)",
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
				trait: item.cropOntologyData.observationVariableName ?? null,
				format: mapFormat(item.cropOntologyData.scale?.dataType ?? "text"),
				defaultValue: item.cropOntologyData.defaultValue ?? null,
				minimum: item.cropOntologyData.scale?.validValues?.minimumValue ?? null,
				maximum: item.cropOntologyData.scale?.validValues?.maximumValue ?? null,
				details: item.cropOntologyData.trait?.description ?? null,
				categories:
					item.cropOntologyData.scale?.validValues?.categories ?? null,
				isVisible: true,
				realPosition: index + 1,
			}));

			console.log(mappedData);

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

			const csvStringifier = createObjectCsvStringifier({
				header: headers,
				alwaysQuote: true,
			});

			const csvContent =
				csvStringifier.getHeaderString() +
				csvStringifier.stringifyRecords(mappedData);

			const stream = Readable.from(csvContent);

			res.setHeader("Content-Type", "text/csv");
			// res.setHeader(
			// 	"Content-Disposition",
			// 	`attachment; filename=${listName}-FieldBook.csv`
			// );

			stream.pipe(res);

			stream.on("end", () => {
				console.log("CSV file sent successfully!");
			});

			stream.on("error", (err) => {
				console.error("Error sending the CSV file:", err);
				res.status(500).send({ error: "Failed to send the CSV file" });
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

			res.send(jsonContent);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listRouter.get(
	"/userCustomVariables",
	expressAsyncHandler(async (req, res) => {
		try {
			let customVariablesArray = null;

			if (airtable) customVariablesArray = await getUserCustomVariablesA(req);
			else customVariablesArray = await getUserCustomVariables(req);

			res.status(200).json({
				message: "Custom Variables",
				customVariables: customVariablesArray,
			});
		} catch (error) {
			console.log(error);
		}
	})
);

listRouter.post(
	"/getUserLists",
	expressAsyncHandler(async (req, res) => {
		try {
			let userLists = null;
			// for airtable
			if (airtable) userLists = await getUserListsA(req);
			else userLists = await getUserLists(req); // for baserow

			console.log(userLists);
			res.status(200).json(userLists);
		} catch (error) {
			console.log(error);
		}
	})
);

listRouter.post(
	"/getListInfo",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			let resBody = null;
			if (airtable) {
				resBody = await getListInfoA(req);
			} else {
				resBody = await getListInfo(req);
			}

			res.status(200).json(resBody);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

listRouter.post(
	"/removeUserList",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			let updatedLists = null;

			if (airtable) updatedLists = await removeUserListA(req);
			else updatedLists = await removeUserList(req);
			res.status(200).json({
				message: "List Removed",
				updatedLists: updatedLists,
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
	"/removeVariable",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			let updatedList = null;

			if (airtable) updatedList = await removeVariableA(req);
			else updatedList = await removeVariable(req);
			res.status(200).json({
				message: "Variable Removed",
				updatedList: updatedList,
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
	"/addVariable",
	expressAsyncHandler(async (req, res) => {
		try {
			if (airtable) await addVariableA(req);
			else await addVariable(req);
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
	"/addCustomVariable",
	expressAsyncHandler(async (req, res) => {
		try {
			// for baserow
			let bRowID = null;

			if (airtable) bRowID = await addCustomVariableA(req);
			else bRowID = await addCustomVariable(req);
			res.status(200).json({
				message: "Variables Added",
				baserowID: bRowID,
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
	"/addMultipleCustomVariables",
	expressAsyncHandler(async (req, res) => {
		try {
			let variablesAdded = null;
			if (airtable) variablesAdded = await addMultipleCustomVariablesA(req);
			else variablesAdded = await addMultipleCustomVariables(req);

			res.status(200).json({
				message: "Variables Added",
				variables: variablesAdded,
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
	"/createList",
	expressAsyncHandler(async (req, res) => {
		try {
			let response = null;
			if (airtable) response = await createListA(req);
			else response = await createList(req);
			console.log(response);
			res.status(200).json(response);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

module.exports = listRouter;
