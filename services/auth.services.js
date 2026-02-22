import { ACCESS_TOKEN_EXPIRY,REFRESH_TOKEN_EXPIRY,MILLISECONDS_PER_SECOND} from "../config/constants.js"

import { and, eq, gte, lt, sql } from "drizzle-orm"
import { db } from "../config/db.js"
import { oauthAccountsTable, passwordResetTokensTable, sessionsTable, shortLinksTable, usersTable, verifyEmailTokensTable } from "../drizzle/schema.js"

import jwt from "jsonwebtoken"

import crypto from "crypto";
import { sendEmail } from "../lib/email-verify-resend.js"
import path from "path"
import fs from "fs/promises"
import mjml2html from "mjml"
import ejs from "ejs"
import argon2 from "argon2"
import { asyncWrapProviders } from "async_hooks"



export const getUserByEmail=async(email)=>{
const [user]=await db.select().from(usersTable).where(eq(usersTable.email,email))
return user;
}

export const createUser= async({name,email,password})=>{
	return await db.insert(usersTable).values({name,email,password}).$returningId();
}
//generate jwt token
export const generatetoken=({id,name,email})=>{
	return jwt.sign({id,name,email},process.env.JWT_SECRET,{
		expiresIn:"30d"
	})
}
//verifyjwttoken
export const verifyjwttoken=(token)=>{
	return jwt.verify(token,process.env.JWT_SECRET)
}
//inserting data in the session table
export const createSession=async(userId,{ip,userAgent})=>{
	const [session]=await db.insert(sessionsTable).values({userId,ip,userAgent}).$returningId();
	return session;
}

//createaccesstoken
export const createAccessToken=({id,name,email,sessionId})=>{
	return jwt.sign({id,name,email,sessionId},process.env.JWT_SECRET,{
		expiresIn:ACCESS_TOKEN_EXPIRY/MILLISECONDS_PER_SECOND,//EXPIRESIN:"15MIN"
	})
}
//createrefreshtoken
export const createRefreshToken=(sessionId)=>{
	return jwt.sign({sessionId},process.env.JWT_SECRET,{
		expiresIn:REFRESH_TOKEN_EXPIRY/MILLISECONDS_PER_SECOND,//EXPIRESIN:"1 WEEK"
	})
}

//refereshing access token after expiry
//!steps
//step-1:check validity of refreshtoken
//step 2:if yes,get the session with the help of sessionId embedded with refreshtoken
//step 3: once we get sessionsTable userid we can easily get all info of user from usersTable and can create a new access_token 
// and then fetches it again.

//findSessionById
export const findSessionById=async(sessionId)=>{
	const [session]=await db.select().from(sessionsTable).where(eq(sessionsTable.id,sessionId))
	return session
}
// findUserById
export const findUserById=async(userId)=>{
	const [user]=await db.select().from(usersTable).where(eq(usersTable.id,userId))
	return user
}

//main function
export const refreshTokens=async(refreshToken)=>{
	try{
   const decodedtoken=await verifyjwttoken(refreshToken)  //verifying refreah token 
   const currentSession=await findSessionById(decodedtoken.sessionId)   // getting the session by session Id passed in refresh token

   if(!currentSession || !currentSession.valid){  //checking if session exists or valid or not
	throw new Error("Invalid Session")
   }

   const user=await findUserById(currentSession.userId) //If session exists then finding user info by using userId(sessionId)(foreign key)

   if(!user){
	throw new Error("Invalid User")
   }

   const userInfo={  //creating new token
	id:user.id,
	name:user.name,
	email:user.email,
	isEmailValid:user.isEmailValid,
	sessionId:currentSession.id
   };

   const newAccessToken=createAccessToken(userInfo) //creating new access token
   const newRefreshToken=createRefreshToken(currentSession.id) // creating new refresh token
return {
	newAccessToken,newRefreshToken,user:userInfo
}

	}catch(error){
		throw error;
	}  
}

//deleting session by sessionId(logout)
export const clearUserSession=async(sessionId)=>{
	return db.delete(sessionsTable).where(eq(sessionsTable.id,sessionId))  // when logout clearing the session also
}

//authenticating user
export const authenticateuser=async({req,res,user,name,email})=>{
	//? we need to create a session
const session=await createSession(user.id,{
	ip:req.clientIp,// method to get client ip 
	userAgent:req.headers["user-agent"]
})

//creating access and refresh tokens
const accesstoken=createAccessToken({
	id:user.id,
	name:user.name||name,
	email:user.email||email,
	isEmailValid:false,
	sessionId:session.id,
})

const refreshtoken=createRefreshToken(session.id)

const baseConfig={httpOnly:true,secure: process.env.NODE_ENV === "production"};
res.cookie("access_token",accesstoken,{
	...baseConfig,
	maxAge:ACCESS_TOKEN_EXPIRY
})

res.cookie("refresh_token",refreshtoken,{
	...baseConfig,
	maxAge:REFRESH_TOKEN_EXPIRY
})

}


//getAllshortLinks

export const getAllShortLinks=async(userId)=>{
	return db.select().from(shortLinksTable).where(eq(shortLinksTable.userId,userId))
}

//updating the name from edit -profile page
export const updateUserByName=async({userId,name})=>{
	return await db.update(usersTable).set({name:name}).where(eq(usersTable.id,userId))
}

// creating 8 digit token

export const generateRandomToken=(digit=8)=>{
	const min=10 ** (digit-1);
	const max=10 **  digit;
    return crypto.randomInt(min,max).toString()
}

//inserting the token and user id in verifyemailstokenstable
export const insertverifyEmailToken=async({userId,token})=>{
	//using transaction concept(either full i.e delete and insert otherwise none)
	return db.transaction(async(tx)=>{
try{
//first we have to delete the expiry tokens
await tx.delete(verifyEmailTokensTable).where(lt(verifyEmailTokensTable.expiresAt,sql`CURRENT_TIMESTAMP`))
await tx.delete(verifyEmailTokensTable).where(eq(verifyEmailTokensTable.userId,userId))

return await tx.insert(verifyEmailTokensTable).values({userId,token})
}catch(err){
   console.error(err);
}
})
}


//creating a verify  link for the token and email
export const createVerifyEmailLink=async({email,token})=>{
  const url=new URL(`${process.env.FRONTEND_URL}/verify-email-token`);//using url api to create a link.
  url.searchParams.append('token',token);//appending the query params to the url 
  url.searchParams.append('email',email);//appending the query params to the url 
  return url.toString();
}


//creating a func to check whether the tokens and email and expirydate stored in the db and url are same or not

// export const findVerificationEmailToken=async({token,email})=>{

// 	const tokenData=await db.select({
// 		userId:verifyEmailTokensTable.userId,
// 		token:verifyEmailTokensTable.token,
// 		expiresAt:verifyEmailTokensTable.expiresAt
// 	})
// 	.from(verifyEmailTokensTable)
// 	.where(and(eq(verifyEmailTokensTable.token,token),
//                gte(verifyEmailTokensTable.expiresAt,sql`CURRENT_TIMESTAMP`)
// 			)
// 		)

// //if no token found
//    if(!tokenData.length){
//  	  return null;
//    }	
//    //getting the userId
//    const {userId}=tokenData[0]	

//    //getting the email with the help of uerId from UsersTable
//    const userData=await db.select({
// 	userId:usersTable.id,
// 	email:usersTable.email
//    }).from(usersTable).where(eq(usersTable.id,userId))

//    if(!userData.length){return null}
//    return{
// 	userId:userData[0].userId,
// 	email:userData[0].email,
// 	token:userData[0].token,  
// 	expiresAt:userData[0].expiresAt,
//    }
// }    


export const findVerificationEmailToken=async({token,email})=>{

	return  db.select({
		userId:usersTable.id,
		email:usersTable.email,
		token:verifyEmailTokensTable.token,
		expiresAt:verifyEmailTokensTable.expiresAt
	})
	.from(verifyEmailTokensTable)
	.where(and(eq(verifyEmailTokensTable.token,token),
               gte(verifyEmailTokensTable.expiresAt,sql`CURRENT_TIMESTAMP`),
			   (eq(usersTable.email,email))
			)
		).innerJoin(usersTable,eq(verifyEmailTokensTable.userId,usersTable.id))

	
	}
    

//verify if the email is same or not if yes then true the value of IsEmailValid
export const verifyUserEmailAndUpdate=async(email)=>{
	return  db.update(usersTable).set({isEmailValid:true})
	.where(eq(usersTable.email,email));
}

//clearing the tokens after the verifacation
export const clearVerifyEmailTokens=async(email)=>{
	//fetch the userdata using email
	const [user]=await db.select().from(usersTable).where(eq(usersTable.email,email));
   //deleting all the tokens associated with the given userId
	return await db.delete(verifyEmailTokensTable).where(eq(verifyEmailTokensTable.userId,user.id));
}

export const sendNewVerifyEmailLink=async({email,userId})=>{
		const RandomToken=generateRandomToken()	
	
		await insertverifyEmailToken({userId,token:RandomToken})
	
		const verifyEmailLink= await createVerifyEmailLink({email,token:RandomToken})
	
	//using mjml model to make responsive email page

	//Step 1:get the data from the mjml file
	const mjmlTemplate= await fs.readFile(path.join(import.meta.dirname,"..","emails","verify-email.mjml"),"utf-8")

	//Step 2:replace the placeholders in the .mjml file from the actual data
	  const fileTemplate= ejs.render(mjmlTemplate,{
		code:RandomToken,
		link:verifyEmailLink
	  })

	  //Step 3:As nodemailer only takes html not mjml so we have to convert mjml data to html
	  const htmlOutput=mjml2html(fileTemplate).html
	 sendEmail( {
		to: email,
		subject: "Verify your email",
		html: htmlOutput
	  }).catch(console.error);
	
}

//updating the pass in DB after successfull change password
export const updateUserPassword=async({userId,newPassword})=>{
	const hashedpassword=await argon2.hash(newPassword)
	return await db.update(usersTable).set({password:hashedpassword}).where(eq(usersTable.id,userId))
}

//finduserbyemail
export const finduserbyEmail=async(email)=>{
	const [user]=await db.select().from(usersTable).where(eq(usersTable.email,email))
	return user;
}

//!in the given func(createResetPasswordLink) to do steps are
    //1: random token ✅
	// 2: convert into hash token ✅
	// 3: clear the user prev. data - delete ✅
	// 4: now we need to insert userid, hashToken ✅
	// 5: return the link (create the link ) ✅

export const createResetPasswordLink=async({userId})=>{
	//step1:generate random token;
	const randomToken=crypto.randomBytes(32).toString('hex');
	
	//step2:convert into hash token
	const tokenHash=crypto.createHash("sha256").update(randomToken).digest("hex");
    
	//step3:clear the users previous data if exists
	await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId,userId))
	
	//step 4:insert the userId,hashToken in the passworsResetTokenstable
	await db.insert(passwordResetTokensTable).values({userId,tokenHash});

	//step5:return the link
	return `${process.env.FRONTEND_URL}/reset-password/${randomToken}`;
}

//getResetPasswordTokenPage
export const getResetPasswordToken=async(token)=>{
	//Steps to follow
	//1. first hash the given token.
	//2.compare the given hashed token with the stored token in DB.
	//3if yes also check expiresAt of the token
	const tokenHash=crypto.createHash("sha256").update(token).digest("hex");
	const [data]=await db.select().from(passwordResetTokensTable)
	    .where(and(eq(passwordResetTokensTable.tokenHash,tokenHash),
		 gte(passwordResetTokensTable.expiresAt,sql`CURRENT_TIMESTAMP`)))
    return data;

}


// clearResetTokenData

export const clearResetTokenData =async(userId)=>{
	return await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId,userId))
}
//getting user with oauthid
export async function getUserWithOauthId({ email, provider }) {
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      isEmailValid: usersTable.isEmailValid,
      providerAccountId: oauthAccountsTable.providerAccountId,
      provider: oauthAccountsTable.provider,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .leftJoin(
      oauthAccountsTable,
      and(
        eq(oauthAccountsTable.provider, provider),
        eq(oauthAccountsTable.userId, usersTable.id)
      )
    );

  return user;
}

export async function linkUserWithOauth({
  userId,
  provider,
  providerAccountId,
}) {
  await db.insert(oauthAccountsTable).values({
    userId,
    provider,
    providerAccountId,
  });
}

export async function createUserWithOauth({
  name,
  email,
  provider,
  providerAccountId,
}) {
  const user = await db.transaction(async (trx) => {
    const [user] = await trx
      .insert(usersTable)
      .values({
        email,
        name,
        // password: "",
        isEmailValid: true, // we know that google's email are valid
      })
      .$returningId();

    await trx.insert(oauthAccountsTable).values({
      provider,
      providerAccountId,
      userId: user.id,
    });

    return {
      id: user.id,
      name,
      email,
      isEmailValid: true, // not necessary
      provider,
      providerAccountId,
    };
  });

  return user;
}