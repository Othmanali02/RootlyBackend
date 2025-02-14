const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const axios = require("axios");
const generateID = require("../services/tools.js");
 
const listRouter = express.Router();

listRouter.post(
	"/getUserLists",
	expressAsyncHandler(async (req, res) => {
		try {
			let email = req.body.email;

			const bRowURL =
				"https://portal.ardbase.org/api/database/rows/table/675/?user_field_names=true";

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			const userObj = response.data.results.find(
				(item) => item.Email === email
			);

			let listInformation = [];
			let lists = userObj.Lists;

			for (let i = 0; i < userObj.Lists.length; i++) {
				const bRowURL = `https://portal.ardbase.org/api/database/rows/table/676/${lists[i].id}/?user_field_names=true`;

				const response = await axios.get(bRowURL, {
					headers: {
						Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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
				"https://portal.ardbase.org/api/database/rows/table/676/?user_field_names=true";

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			let items = response.data.results;

			const matchedList = items.filter(
				(item) => item["List ID"] === req.body.listId
			);

			let listName = matchedList[0].Name;

			// let owner = items.Owner[0].value; // compute the id of the user with another bRow request

			const bRowURL2 =
				"https://portal.ardbase.org/api/database/rows/table/677/?user_field_names=true&size=200";

			const response1 = await axios.get(bRowURL2, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			let listContent = response1.data.results;

			const matchedItems = listContent.filter((item) =>
				item["List ID"].some((list) => list.value === req.body.listId)
			);

			variableDbIds = [];
			for (let i = 0; i < matchedItems.length; i++) {
				variableDbIds.push(matchedItems[i]["Variable Db Id"]);
			}

			const cropOntologyUrl = "http://127.0.0.1:5900/brapi/v2/search/variables";

			const reqBody = {
				observationVariableDbIds: variableDbIds,
			};

			console.log(reqBody);

			const response2 = await axios.post(cropOntologyUrl, reqBody);

			let resBody = {
				listName: listName,
				items: response2.data.result,
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
				"https://portal.ardbase.org/api/database/rows/table/676/?user_field_names=true";

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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
				"https://portal.ardbase.org/api/database/rows/table/676/?user_field_names=true";

			const response = await axios.post(firstUrl, req_data, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			// Creating the lsit content in the list content table

			const secondUrl =
				"https://portal.ardbase.org/api/database/rows/table/677/?user_field_names=true";

			for (let i = 0; i < requestData.traits.length; i++) {
				const listContentData = {
					"List Content ID": await generateID(),
					"List ID": [listId],
					"Variable Db Id": traits[i].observationVariableDbId,
				};

				const response1 = await axios.post(secondUrl, listContentData, {
					headers: {
						Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
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
