const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/userRoutes.js");
const listRouter = require("./routes/listRoutes.js");
const teamRouter = require("./routes/teamRoutes.js");
const listAirtableRouter = require("./routes/airtable/listRoutes.js");
const teamAirtableRouter = require("./routes/airtable/teamRoutes.js");
const userAirtableRouter = require("./routes/airtable/userRoutes.js");
const app = express();


app.use(express.json());
app.use(cookieParser());

app.use(cors());

app.use("/rootly/users", userRouter);
app.use("/rootly/airtable/users", userAirtableRouter);

app.use("/rootly/lists", listRouter);
app.use("/rootly/airtable/lists", listAirtableRouter);


app.use("/rootly/teams", teamRouter);
app.use("/rootly/airtable/teams", teamAirtableRouter);


app.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});
