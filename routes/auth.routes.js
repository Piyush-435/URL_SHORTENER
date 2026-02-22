import { Router } from "express";
import * as authControllers from "../controllers/auth.controllers.js"
const router=Router()

router.route("/login").get(authControllers.getLoginPage).post(authControllers.postLogin)
router.route("/register").get(authControllers.getRegisterPage).post(authControllers.postRegister)


router.route("/me").get(authControllers.getMe);

//creating a route for profile page
router.route("/profile").get(authControllers.getProfilePage)

//creating a verify email page
router.route("/verify-email").get(authControllers.getVerifyEmailPage)

//creating a route for sending a verification link
router.route("/resend-verification-link").post(authControllers.resendVerificationLink)

//creating a link for verification of the token(enter 8 digit code section)
router.route("/verify-email-token").get(authControllers.verifyEmailToken)

//creating a route for the edit profile page
router.route("/edit-profile").get(authControllers.getEditProfilePage).post(authControllers.postEditProfile);

//creating route for change-password page
router.route("/change-password").get(authControllers.getChangePasswordPage).post(authControllers.postChangePasswordPage);

//creating a route for the forget password page
router.route("/reset-password").get(authControllers.getResetPasswordPage).post(authControllers.postResetPassword);

//creating route for reset password page
router.route("/reset-password/:token").get(authControllers.getResetPasswordTokenPage).post(authControllers.postResetPasswordToken);

//creating a route for login with google
router.route("/google").get(authControllers.getGoogleLoginPage);
router.route("/google/callback").get(authControllers.getGoogleLoginCallback);

//creating a route for login with github
router.route("/github").get(authControllers.getGithubLoginPage);
router.route("/github/callback").get(authControllers.getGithubLoginCallback);
//setting about and contact section
router.route("/about").get(authControllers.getaboutPage)
router.route("/contact").get(authControllers.getcontactPage)


router.route("/set-password").get(authControllers.getSetPasswordPage).post(authControllers.postSetPassword);

router.route("/logout").get(authControllers.logout);

export const authRoutes= router;