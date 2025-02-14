const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const authUtils = require("./auth-util.js");
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/userRoutes.js");
const listRouter = require("./routes/listRoutes.js");
const app = express();

const discoveryUri = process.env.DISCOVERY_URI;
const redirectUri = process.env.OAUTH_REDIRECT_URI;

var OAuthClient;
authUtils.buildAuthClient(
	discoveryUri,
	redirectUri,
	process.env.CLIENT_ID,
	process.env.CLIENT_SECRET,
	(client) => (OAuthClient = client)
);

app.use(express.json());
app.use(cookieParser());

app.use(cors());

app.get("/", () => {
	res.send("Rootly!!");
});


app.get("/users/redirect", (req, res) => {
	console.log(req.body);
	res.send("Rootly!!");
});

app.use("/rootly/users", userRouter);

app.use("/rootly/lists", listRouter)


app.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});
