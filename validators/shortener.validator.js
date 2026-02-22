import {z} from "zod"

export const shortnerschema=z.object({
	url:z
	.string({required_error:"URl is required"})
	.trim()
	.url({message:"Please enter a valid URL"})
	.max(1024,{message:"URL cannot be longer than 1024 characters"}),


	shortCode:z
	.string({required_error:"URl is required"})
	.trim()
	.min(2,{message:"Short code must be at least 2 characters long"})
	.max(100,{message:"Short code cannot be longer than 100 haracters long"})
	.optional()

	
})