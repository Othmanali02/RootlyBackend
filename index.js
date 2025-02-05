const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const modifyOntologies = require("./services/cropontologies.js");

const ontData = require("./data.json");
const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

app.get("/", () => {
	res.send("Rootly!!");
});

app.get("/ontologies", (req, res) => {
	let allOntologies = modifyOntologies();
	// const rawData = fs.readFileSync("./data.json");
	// const jsonData = JSON.parse(rawData);

	// jsonData.forEach((item, index) => {
	// 	console.log("Ontology Name = ", item.result[0].ontologyName);
	// 	console.log("Total Count = ", item.metadata.pagination.totalCount);

  //   console.log("----------------------------------------------------");
	// });

	res.send(ontData.length + " yes");
});

app.post("/upload", upload.single("file"), (req, res) => {
	if (!req.file) {
		return res.status(400).json({ message: "No file uploaded" });
	}

	const filePath = path.join(__dirname, req.file.path);

	fs.readFile(filePath, "utf8", (err, data) => {
		if (err) {
			return res.status(500).json({ message: "Error reading file" });
		}

		res.json({ filename: req.file.originalname, content: data });

		fs.unlink(filePath, () => {});
	});
});

app.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});
