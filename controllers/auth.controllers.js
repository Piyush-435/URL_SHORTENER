import { getUserByEmail,createUser,
	clearUserSession,
	authenticateuser,
	getAllShortLinks,findUserById,
    generateRandomToken,
	insertverifyEmailToken,
	createVerifyEmailLink,
	verifyUserEmailAndUpdate,
	findVerificationEmailToken,
	clearVerifyEmailTokens,
	sendNewVerifyEmailLink,
	updateUserByName,
	updateUserPassword,
	finduserbyEmail,
	createResetPasswordLink,
	getResetPasswordToken,
	clearResetTokenData,
	linkUserWithOauth,
	createUserWithOauth,
	getUserWithOauthId}
	from "../services/auth.services.js";

import argon2 from "argon2"
import { loginUserSchema, registerUserSchema, verifyEmailSchema, verifyUserSchema,verifyPasswordSchema, verifyResetPasswordSchema, verifyForgetPasswordSchema, setPasswordSchema } from "../validators/auth-validator.js";
import { getHtmlFromMjmlTemplate } from "../lib/get-html-from-mjml-template.js";
import { sendEmail } from "../lib/email-verify-resend.js";
import { decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { google } from "../lib/oauth/google.js";
import { OAUTH_EXCHANGE_EXPIRY } from "../config/constants.js";
import { github } from "../lib/oauth/github.js";
// import { sendEmail } from "../lib/nodemailer.js";


// import { sessionsTable } from "../drizzle/schema.js";




export const getRegisterPage = (req, res) => {
	if(req.user) {return res.redirect("/")}
  return res.render("auth/register",{errors:req.flash("errors")});
};

export const getLoginPage = (req, res) => {
	if(req.user) return res.redirect("/")
  return res.render("auth/login",{errors:req.flash("errors")});
};

export const postLogin = async(req, res) => {
	if(req.user) return res.redirect("/")
//    const {email,password}=req.body;
//!Now below is validation using zod "safeParse() method " and then fetching the data 
 const result = loginUserSchema.safeParse(req.body);

if (!result.success) {
  const errors = result.error.issues.map(e => e.message);
  req.flash("errors", errors);
  return res.redirect("/login");
}
//!
const {email,password}=result.data;
   const user=await getUserByEmail(email);
   if(!user){
	req.flash("errors","Invalid password or username")
    return res.redirect("/login")
   }

   if (!user.password) {
    // database hash password
    // if password is null
    req.flash(
      "errors",
      "You have created account using social login. Please login with your social account."
    );
    return res.redirect("/login");
  }

//! hashed password comparision wiht argon2
const comparepassword=await argon2.verify(user.password,password)
 if(!comparepassword){
	req.flash("errors","Invalid password or username")
	return res.redirect("/login")}
//!
//!using JWT TOKEN
// const token=generatetoken({
// 	id:user.id,
// 	name:user.name,
// 	email:user.email
// })
// res.cookie("JWT_TOKEN",token)

  await authenticateuser({req,res,user});

	return res.redirect("/");


};
export const postRegister = async (req, res) => {
	if(req.user) return res.redirect("/")
//! before we were just getting data from body without validating
	// const {name,email,password}=req.body;//!gets the data by destructuring
//!Now below is validation using zod "safeParse() method " and then fetching the data 
 const result = registerUserSchema.safeParse(req.body);

if (!result.success) {
  const errors = result.error.issues.map(e => e.message);
  req.flash("errors", errors);
  return res.redirect("/register");
}
//!
const { name, email, password } = result.data;



	const userExists= await getUserByEmail(email);//Check if email alraedy exists in the db or not
	if(userExists){  
		req.flash("errors","User already exists")
		return res.redirect("/register")
	}

//! using hashing with argon2
       const hashedpassword=await argon2.hash(password,10)//convert normal pass to hashed pass
        const [user]=await createUser({name,email,password:hashedpassword}) 


    await authenticateuser({req,res,user,name,email});
    
	 await sendNewVerifyEmailLink({email,userId:user.id})

	return res.redirect("/");	

//    res.redirect("/login");
};

//!showing the info of user
export const getMe=(req,res)=>{
if(!req.user){
    res.send("Not logged In")
}else{
	res.send(`<h1>Hey ${req.user.name} and ${req.user.email}</h1>`)
}
}
//!

//! applying logout functionality

export const logout=async(req,res)=>{
	if(req.user){
		await clearUserSession(req.user.sessionId)
		res.clearCookie("access_token")
		res.clearCookie("refresh_token")
		res.redirect("/login")
	}
}

//!

//! making a route for profile page

export const getProfilePage=async(req,res)=>{
if(!req.user){return res.redirect("/login")}

const user=await findUserById(req.user.id);

const userShortLinks=await getAllShortLinks(user.id);
const totalClicks = userShortLinks.reduce((sum, link) => {
      return sum + (Number(link.clicks) || 0);
    }, 0);

return res.render("auth/profile",{
	user:{
		id:user.id,
		name:user.name,
		email:user.email,
		isEmailValid:user.isEmailValid, 
		hasPassword: Boolean(user.password),
		createdAt:user.createdAt,
		links:userShortLinks,
		totalClicks
	}
}) 

}

//!making a route for the verify email page

export const getVerifyEmailPage=async(req,res)=>{
	if(!req.user) return res.redirect("/login")
	
	const user=await findUserById(req.user.id)
	if(!user || req.user.isEmailValid) return res.redirect("/")
    
	return res.render("auth/verify-email",{
		email:req.user.email
	})	
}

//making a route for resend verification link

export const resendVerificationLink=async(req,res)=>{
	if(!req.user) return res.redirect("/login")
	
	const user=await findUserById(req.user.id)
	if(!user || req.user.isEmailValid) return res.redirect("/")
    await sendNewVerifyEmailLink({email:req.user.email,userId:req.user.id})

  res.redirect("/verify-email");
}


export const verifyEmailToken=async(req,res)=>{
const {data,error}=verifyEmailSchema.safeParse(req.query);
// check whether the tokens and expirydate stored in the db and url are same or not
const [token]= await findVerificationEmailToken(data);
if(!token) res.send("Verification link invalid or expired")

//checking whether the email in UsersTabls is equal or not to the email passed in the url
await verifyUserEmailAndUpdate(token.email);

//now removing the token from db once after verifying bcz there is no need of token after verification
clearVerifyEmailTokens(token.email).catch(console.error);

//redirecting to the profile page
return res.redirect("/profile");
}


//creating a edit profile page
export const getEditProfilePage=async(req,res)=>{
	if(!req.user) return res.redirect("/")

   const user=req.user;
   if(!user) return res.status(404).send("User not found");
   
   return res.render("auth/edit-profile",{
	name:user.name,
	errors:req.flash("errors")
   })
}

//saving changes from edit profile page
export const postEditProfile = async (req, res) => {
  if (!req.user) return res.redirect("/");

  const { data, error } = verifyUserSchema.safeParse(req.body);
  if (error) {
    const errorMessage = error.errors[0].message;
    req.flash("errors", errorMessage);
    return res.redirect("/");
  }
  await updateUserByName({ userId: req.user.id, name: data.name });

  return res.redirect("/profile");
};

//creating a page for change-password
export const getChangePasswordPage=async(req,res)=>{
	if(!req.user) return redirect("/")
	
	return res.render("auth/change-password",{
		errors:req.flash("errors")
	})	
}
//creating a func for post change password

export const postChangePasswordPage = async (req, res) => {
   if (!req.user) return res.redirect("/");

  const { data, error } = verifyPasswordSchema.safeParse(req.body); //validating the data get by req.body using zod validation
  if (error) {
    const errorMessage = error.issues[0].message; //if error then show the flash error and redirect to same page
    req.flash("errors", errorMessage);
    return res.redirect("/change-password");
  }
const user=await findUserById(req.user.id);  //otherwise get the user by req.user,id and then find its password.
if(!user){
	 req.flash("errors", "Invalid password");
    return res.redirect("/change-password");
}
  const {currentPassword,newPassword}=data;

  const isPasswordValid=await argon2.verify(user.password,currentPassword)//verifying the current password and stord passwrod in the DB.
 if (!isPasswordValid) {
    req.flash("errors", "Current Password that you entered is invalid");
    return res.redirect("/change-password");
  }
  await updateUserPassword({ userId: user.id, newPassword}); //if mathes then update the db pass with newPasssword

  return res.redirect("/profile");//redorect to profile page
}


//creating a func for reset-password page
export const getResetPasswordPage=async(req,res)=>{
	return res.render("auth/forget-password",{  //we dont check the if(!req.user) coditon bcz it is true and other code is not going to execute
       formSubmitted:req.flash("formSubmitted")[0],
	   errors:req.flash("errors") //it will display errors.
	})	
}

//creating a func for post reset password

export const postResetPassword=async(req,res)=>{
	const {data,error}= verifyForgetPasswordSchema.safeParse(req.body);//validating if the password format is correct or not
	if(error){
	const errorMessages = error.issues.map((err) => err.message);
    req.flash("errors", errorMessages[0]);
    return res.redirect("/reset-password");
	}
	const user=await finduserbyEmail(data.email);
	if(user){
		const resetPasswordLink=await createResetPasswordLink({userId:user.id})
    
	// in the given func   (createResetPasswordLink) to do steps are
    //1: random token ✅
	// 2: convert into hash token ✅
	// 3: clear the user prev. data - delete ✅
	// 4: now we need to insert userid, hashToken ✅
	// 5: return the link (create the link ) ✅
	  
	 const html=await getHtmlFromMjmlTemplate("reset-email-password",{
		name:user.name,
		link:resetPasswordLink
	 })

	 sendEmail({
		to:user.email,
		subject:"RESET YOUR PASSWORD",
		html
	 })

	 req.flash("formSubmitted",true)
	 return res.redirect("/reset-password")
	}
}

//creating a func for getResetPasswordTokenPage
export const getResetPasswordTokenPage=async(req,res)=>{
	const {token}=req.params;
	const passwordResetData=await getResetPasswordToken(token); //checking if the provided token is equal to token in DB
     if(!passwordResetData) return res.render("auth/wrong-reset-password-token")

    return res.render("auth/reset-password",{
		formSubmitted:req.flash("formSubmitted")[0],
	    errors:req.flash("errors"), //it will display errors.
	    token
	})		
}

//creating a func for postResetPasswordToken
//steps to perform
//! 1 Extract password reset token from request parameters.
//! 2 Validate token authenticity, expiration, and match with a previously issued token.
//! 3 If valid, get new password from request body and validate using a schema (e.g., Zod) for complexity.
//! 4 Identify user ID linked to the token.
//! 5 Invalidate all existing reset tokens for that user ID.
//! 6 Hash the new password with a secure algorithm .
//! 7 Update the user's password in the database with the hashed version.
//! 8 Redirect to login page or return a success response.

export const postResetPasswordToken=async(req,res)=>{
	//step 1 and 2
	const {token}=req.params;
	const passwordResetData=await getResetPasswordToken(token); //checking if the provided token is equal to token in DB
    if (!passwordResetData) {
    req.flash("errors", "Password Token is not matching");
    return res.render("auth/wrong-reset-password-token");
  }
  //step 3
  const  {data,error}=verifyResetPasswordSchema.safeParse(req.body);
  if (error) {
    const errorMessages = error.issues.map((err) => err.message);
    req.flash("errors", errorMessages[0]);
    return res.redirect(`/reset-password/${token}`);
  }

  

  //step 4
  const user=await findUserById(passwordResetData.userId);

  //step 5
  await clearResetTokenData(user.id)

  //step 6 and 7
  const {newPassword}=data;
  await updateUserPassword({userId:user.id,newPassword})

  //step 8
  return res.redirect("/login")
}

//! Controller: Redirects user to Google OAuth login page
export const getGoogleLoginPage = async (req, res) => {

  // ✅ Step 1: Check if user is already logged in
  // If authenticated, redirect to home page
  if (req.user) return res.redirect("/");

  // ✅ Step 2: Generate security parameters
  // state → protects against CSRF attacks(secret token to verify request)
  const state = generateState();

  // codeVerifier → used in PKCE flow for secure token exchange(secret password for code exchange)
  const codeVerifier = generateCodeVerifier();

  // ✅ Step 3: Create Google authorization URL
  // Scopes define what information we request from Google
  // openid → authentication
  // profile → basic user details
  // email → user email address
  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  // ✅ Step 4: Configure secure cookie settings
  const cookieConfig = {
    httpOnly: true,                // Prevents client-side JS access
    secure: process.env.NODE_ENV === "production", // Sends cookie only over HTTPS
    maxAge: OAUTH_EXCHANGE_EXPIRY, // Expiry time for OAuth process
    sameSite: "lax",               // Allows cookies during redirect from Google
  };

  // ✅ Step 5: Store state and codeVerifier in cookies
  // These will be used later to verify Google response
  res.cookie("google_oauth_state", state, cookieConfig);
  res.cookie("google_code_verifier", codeVerifier, cookieConfig);

  // ✅ Step 6: Redirect user to Google login page
  res.redirect(url.toString());
};

//getGoogleLoginCallback
export const getGoogleLoginCallback = async (req, res) => {
  // google redirects with code, and state in query params
  // we will use code to find out the user
  const { code, state } = req.query;
  console.log(code, state);

  const {
    google_oauth_state: storedState,
    google_code_verifier: codeVerifier,
  } = req.cookies;

  if (
    !code ||
    !state ||
    !storedState ||
    !codeVerifier ||
    state !== storedState
  ) {
    req.flash(
      "errors",
      "Couldn't login with Google because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  let tokens;
  try {
    // arctic will verify the code given by google with code verifier internally
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    req.flash(
      "errors",
      "Couldn't login with Google because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  

  const claims = decodeIdToken(tokens.idToken());
  const { sub: googleUserId, name, email } = claims;

  // there are few things that we should do
  // Condition 1: User already exists with google's oauth linked
  // Condition 2: User already exists with the same email but google's oauth isn't linked
  // Condition 3: User doesn't exist.

  // if user is already linked then we will get the user
  let user = await getUserWithOauthId({
    provider: "google",
    email,
  });

  // if user exists but user is not linked with oauth
  if (user && !user.providerAccountId) {
    await linkUserWithOauth({
      userId: user.id,
      provider: "google",
      providerAccountId: googleUserId,
    });
  }

  // if user doesn't exist
  if (!user) {
    user = await createUserWithOauth({
      name,
      email,
      provider: "google",
      providerAccountId: googleUserId,
    });
  }
  await authenticateuser({ req, res, user, name, email });

  res.redirect("/");
};


//!getGithubLoginPage
export const getGithubLoginPage = async (req, res) => {
  if (req.user) return res.redirect("/");

  const state = generateState();

  const url = github.createAuthorizationURL(state, ["user:email"]);

  const cookieConfig = {
    httpOnly: true,
    secure: true,
    maxAge: OAUTH_EXCHANGE_EXPIRY,
    sameSite: "lax", // this is such that when google redirects to our website, cookies are maintained
  };

  res.cookie("github_oauth_state", state, cookieConfig);

  res.redirect(url.toString());
};


//getGithubLoginCallback
export const getGithubLoginCallback = async (req, res) => {
  const { code, state } = req.query;
  const { github_oauth_state: storedState } = req.cookies;

  function handleFailedLogin() {
    req.flash(
      "errors",
      "Couldn't login with GitHub because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  if (!code || !state || !storedState || state !== storedState) {
    return handleFailedLogin();
  }

  let tokens;
  try {
    tokens = await github.validateAuthorizationCode(code);
  } catch {
    return handleFailedLogin();
  }

  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
    },
  });
  if (!githubUserResponse.ok) return handleFailedLogin();
  const githubUser = await githubUserResponse.json();
  const { id: githubUserId, name } = githubUser;

  const githubEmailResponse = await fetch(
    "https://api.github.com/user/emails",
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    }
  );
  if (!githubEmailResponse.ok) return handleFailedLogin();

  const emails = await githubEmailResponse.json();
  const email = emails.filter((e) => e.primary)[0].email; // In GitHub we can have multiple emails, but we only want primary email
  if (!email) return handleFailedLogin();

  // there are few things that we should do
  //! Condition 1: User already exists with github's oauth linked
  //! Condition 2: User already exists with the same email but google's oauth isn't linked
  //! Condition 3: User doesn't exist.

  let user = await getUserWithOauthId({
    provider: "github",
    email,
  });

  if (user && !user.providerAccountId) {
    await linkUserWithOauth({
      userId: user.id,
      provider: "github",
      providerAccountId: githubUserId,
    });
  }

  if (!user) {
    user = await createUserWithOauth({
      name,
      email,
      provider: "github",
      providerAccountId: githubUserId,
    });
  }

  await authenticateuser({ req, res, user, name, email });

  res.redirect("/");
};

//getSetPasswordPage
export const getSetPasswordPage = async (req, res) => {
  if (!req.user) return res.redirect("/");

  return res.render("auth/set-password", {
    errors: req.flash("errors"),
  });
};

//postSetPassword
export const postSetPassword = async (req, res) => {
  if (!req.user) return res.redirect("/");

  const { data, error } = setPasswordSchema.safeParse(req.body);

  if (error) {
    const errorMessages = error.issues.map((err) => err.message);
    req.flash("errors", errorMessages);
    return res.redirect("/set-password");
  }

  const { newPassword } = data;

  const user = await findUserById(req.user.id);
  if (user.password) {
    req.flash(
      "errors",
      "You already have your Password, Instead Change your password"
    );
    return res.redirect("/set-password");
  }

  await updateUserPassword({ userId: req.user.id, newPassword });

  return res.redirect("/profile");
};


//about us and contact controller

export const getaboutPage=(req,res)=>{
	return res.render("auth/about")
}
export const getcontactPage=(req,res)=>{
	return res.render("auth/contact")
}