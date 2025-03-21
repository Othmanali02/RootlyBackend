const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");

const cropOntologyRouter = express.Router();

cropOntologyRouter.get("/getOntologies", async (req, res) => {
	try {
		const cURL = `${process.env.cropOntologyURL}/brapi/v2/ontologies?pageSize=100`;
		const response = await axios.get(cURL);
		console.log(response.data);
		let results = response.data.result.data;
		console.log(results);
		res.status(200).json({
			results,
		});
	} catch (err) {
		res.status(400).json({ message: "Couldn't get ontologies" });
	}
});

cropOntologyRouter.get("/getVariables", async (req, res) => {
	try {
		const ontologyDbID = req.query.ontologyDbID;
		const traitClass = req.query.traitClass;
		console.log(ontologyDbID);
		console.log(traitClass);

		const response = await axios.get(
			`${process.env.cropOntologyURL}/brapi/v2/variables?pageSize=100&ontologyDbId=${ontologyDbID}&traitClass=${traitClass}`
		);
		console.log(response.data.result);
		let result = response.data.result;
		res.status(200).json({
			result,
		});
	} catch (err) {
		res.status(400).json({ message: "Couldn't get ontologies" });
	}
});

cropOntologyRouter.get("/getVariable", async (req, res) => {
	try {
		const observationVariableDbId = req.query.observationVariableDbId;

		const response = await axios.get(
			`${process.env.cropOntologyURL}/brapi/v2/variables?pageSize=100&observationVariableDbId=${observationVariableDbId}`
		);

		let result = response.data.result; // this right here
		res.status(200).json({
			result,
		});
	} catch (err) {
		res.status(400).json({ message: "Couldn't get ontologies" });
	}
});

module.exports = cropOntologyRouter;
