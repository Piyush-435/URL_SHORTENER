// steps to perform
// 1:read the data from the mjml file
// 2:reaplce the placeholders in .mjml file with dynamic data
// 3:convert the mjml file to html file for sending as an email

import fs from "fs/promises"
import path from "path"
import ejs from "ejs"
import mjml2html from "mjml"

export const getHtmlFromMjmlTemplate=async(template,data)=>{
	
	// 1:read the data from the mjml file
	const mjmlTemplate=await fs.readFile(path.join(import.meta.dirname,"..","emails",`${template}.mjml`),"utf-8")


	// 2:reaplce the placeholders in .mjml file with dynamic data
	const filledTemplate=ejs.render(mjmlTemplate,data);
	
	// 3:convert the mjml file to html file for sending as an email
    return mjml2html(filledTemplate).html;
}