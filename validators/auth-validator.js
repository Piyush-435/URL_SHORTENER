import { z } from "zod";

/*
Zod is a validation library used to ensure incoming data matches expected rules.

z.object() defines the structure of the expected input.

*/
//validating email schema
  const emailSchema= z
  .string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(100, { message: "Email cannot be more than 100 characters" })
export const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().trim()
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(100, { message: "Password cannot be more than 100 characters" }),
});
export const registerUserSchema = loginUserSchema.extend({
  name: z.string().trim()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(100, { message: "Name cannot be more than 100 characters" }),

});



/*
  Zod `.extend()` method

  `.extend()` is used to reuse an existing schema and add
  or override fields without rewriting the whole schema.

  This helps avoid repetition and keeps validation logic
  consistent across different forms or APIs.

  Example use case:
  - A base user schema with common fields (email, password)
  - Extend it for registration (add name)
  - Extend it for profile update (add optional fields)

  Important points:
  - The original schema is NOT modified
  - A new schema is created
  - Existing fields can be overridden if needed
*/


//validating the token and email are in correct format or not
export const verifyEmailSchema=z.object({
	token:z.string().trim().length(8),
	email:z.string().trim().email()
})
//verifying if the name format is correct or not
const nameSchema = z
  .string()
  .trim()
  .min(3, { message: "Name must be at least 3 characters long." })
  .max(100, { message: "Name must be no more than 100 characters." });

export const verifyUserSchema=z.object({
	name:nameSchema
})

export const verifyPasswordSchema=z.object({
	currentPassword:z
	.string()
	.min(1,{message:"Current Password is required"}),
	newPassword:z
	.string()
	.min(6,{message:"New password must be at least 6 characters long"})
	.max(100,{message:"New password must be no more than 100 characters"}),

	confirmPassword:z
	.string()
	.min(6,{message:"Confirm password must be at least 6 characters long"})
	.max(100,{message:"Confirm password must be no more than 100 characters"}),
}).refine((data)=>data.newPassword===data.confirmPassword,{
	message:"Password not matched",
	path:["confirmPassword"] //Error will be associated with confirmPassword
})

//.refine help us to compare the password


//forgetPasswordSchema validation
export const verifyForgetPasswordSchema=z.object({
	email: emailSchema
})

//verifyresetpassword schema
const passwordSchema = z.object({
  newPassword: z
    .string()
    .min(6, { message: "New Password must be at least 6 characters long." })
    .max(100, { message: "New Password must be no more than 100 characters." }),
  confirmPassword: z
    .string()
    .min(6, {
      message: "Confirm Password must be at least 6 characters long.",
    })
    .max(100, {
      message: "Confirm Password must be no more than 100 characters.",
    })
	})
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })

export const verifyResetPasswordSchema=passwordSchema;
export const setPasswordSchema = passwordSchema;
