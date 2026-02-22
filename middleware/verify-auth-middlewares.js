import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "../config/constants.js";
import { verifyjwttoken,refreshTokens} from "../services/auth.services.js"

// export const verifyauthentication=(req,res,next)=>{
// 	const token=req.cookies.access_token
// 	if(!token){
// 		req.user=null
// 		return next()
// 	}
// 	try {
// 		const decodedtoken=verifyjwttoken(token);
// 		req.user=decodedtoken
// 		// console.log(req.user)
// 	} catch (error) {
// 		req.user=null;
// 	}
// 	return next()
// }
// ✔️ You can add any property to req, but:

// Avoid overwriting existing properties.
// Use req.user for authentication.
// Group custom properties under req.custom if needed.
// Keep the data lightweight.

//refereshing the access token after expiring
 export const verifyauthentication=async(req,res,next)=>{
	const accessToken=req.cookies.access_token;  //getting access token
	const refreshToken=req.cookies.refresh_token; // getting refresh token
         req.user=null
	if(!accessToken && !refreshToken){   //checking if user exists or not
		
		return next();
	}
	if(accessToken){   //checking if access token exists?If yes then no need to refreash token
		const decodedtoken=verifyjwttoken(accessToken)
		req.user=decodedtoken;
		return next();
	} 
	if(refreshToken){ //If access token doesnot exists then refresh tokens
		try {
			const {newAccessToken,newRefreshToken,user}= await refreshTokens(refreshToken)  //refreshing access token using refresh token
		    req.user=user
			const baseConfig={httpOnly:true,secure: process.env.NODE_ENV === "production"};
			res.cookie("access_token",newAccessToken,{
				...baseConfig,
				maxAge:ACCESS_TOKEN_EXPIRY
			})
			
			res.cookie("refresh_token",newRefreshToken,{
				...baseConfig,
				maxAge:REFRESH_TOKEN_EXPIRY
			})
		return next()
		} catch (error) {
			console.error(error)
		}
	}
	return next()
 }