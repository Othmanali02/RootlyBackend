const express = require("express");
const expressAsyncHandler = require("express-async-handler");
require("dotenv").config();
const axios = require("axios");
const generateID = require("../services/tools.js");

const teamRouter = express.Router();

teamRouter.post(
	"/getUserTeams",
	expressAsyncHandler(async (req, res) => {
		try {
			console.log(req.body.userId);

			const bRowURL = `https://portal.ardbase.org/api/database/rows/table/678/?user_field_names=true`;

			const response = await axios.get(bRowURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			let teamArr = response.data.results;
			let teamList = [];
			let sharedTeams = [];

			for (let i = 0; i < teamArr.length; i++) {
			
				if (teamArr[i]["Leader"].length > 0) {
					if (teamArr[i]["Leader"][0].value === req.body.userId) {
						teamList.push(teamArr[i]);
					}
				}

                if(teamArr[i]["User ID"].length > 0){
                    let usersArry = teamArr[i]["User ID"];
                    for (let j = 0; j < usersArry.length; j++){
                        console.log(usersArry[j]["value"]);

                        if(usersArry[j]["value"] === req.body.userId){
                            sharedTeams.push(teamArr[i]);
                        }
                    }
                }

			}
			console.log(sharedTeams);
			res.status(200).json({ teamList: teamList, sharedTeams: sharedTeams });
		} catch (error) {
			console.log(error);
		}
	})
);

teamRouter.post(
	"/getTeamInfo",
	expressAsyncHandler(async (req, res) => {
		try {

            console.log(req.body);

            
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

teamRouter.post(
	"/createTeam",
	expressAsyncHandler(async (req, res) => {
		try {
			let teamId = await generateID();

			// const req_dat2a = {
			// 	"List ID": teamId,
			// 	Name: req.body.listName,
			// 	Owner: [req.body.userId],
			// 	Length: requestData.traits.length,
			// };

			const usersURL =
				"https://portal.ardbase.org/api/database/rows/table/675/?user_field_names=true";

			const response1 = await axios.get(usersURL, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			let users = response1.data.results;

			let invitedMembers = req.body.invitedMembers;

			let userIds = [];
			for (let i = 0; i < invitedMembers.length; i++) {
				let matchedUser = users.filter(
					(item) => item["Email"] === invitedMembers[i]
				);
				userIds.push(matchedUser[0]["User ID"]);
			}

			let chosenLists = req.body.chosenLists.map((list) => list["List ID"]);

			const req_data = {
				"Team ID": teamId,
				Name: req.body.teamName,
				Description: req.body.description,
				Lists: chosenLists,
				Leader: [req.body.userId],
				"User ID": userIds,
			};

			console.log(req_data);

			const teamsURL =
				"https://portal.ardbase.org/api/database/rows/table/678/?user_field_names=true";

			const response = await axios.post(teamsURL, req_data, {
				headers: {
					Authorization: "Token XdaKz1bZXgGVgX6MQzO0qAXa1X7Vp8uJ",
					"Content-Type": "application/json",
				},
			});

			// Creating the lsit content in the list content table

			res.status(200).json(response.data);
		} catch (error) {
			console.error("Error making the POST request:", error);
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		}
	})
);

module.exports = teamRouter;
