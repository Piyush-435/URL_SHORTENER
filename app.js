import express from "express";
import requestIP from "request-ip"
import { shortenerRoutes } from "./routes/shorterner.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import {verifyauthentication} from "./middleware/verify-auth-middlewares.js"
import session from "express-session"
import flash from "connect-flash"


const app = express();

const PORT=process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());  //?Whenever a request sends JSON data, parse it and put it into req.body.”


app.set("view engine", "ejs");
// app.set("views", "./views")
app.use(cookieParser())

//! use session and flash in the middle of cookieparser and authentication
app.use(session({secret:"parash",resave:true,saveUninitialized:false}));
app.use(flash());

//using requestIp middleware
app.use(requestIP.mw())

//!

app.use(verifyauthentication)
//!
app.use((req,res,next)=>{
	res.locals.user=req.user;  //res.locals used to send data to views now we can use data of req.user as user in ejs files
	return next();
})
//!

app.use(authRoutes);
app.use(shortenerRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});