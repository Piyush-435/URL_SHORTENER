import {createServer} from 'http'
import  fs from 'fs/promises'
import crypto from 'crypto'
import path from 'path'
const PORT=process.env.PORT||4000
const DATA_FILE=path.join("data","links.json")


const serverFile=async (res,path,contenttype)=>{
	try {
		const data= await fs.readFile(path)
		res.writeHead(200,{'Content-Type':contenttype})
		res.end(data)
	} catch (error) {
		res.writeHead(404,{'Content-Type':contenttype})
		res.end("Error 404:Page not found")
	}
}


const loadlinks=async()=>{
     try {
		const info=await fs.readFile(DATA_FILE,'utf-8')
		return JSON.parse(info)
	 } catch (error) {
		if(error.code==='ENOENT'){
			await fs.writeFile(DATA_FILE,JSON.stringify({}))
			return {};
		}
		throw error
	 }
}

const savelinks=async(links)=>{
	await fs.writeFile(DATA_FILE,JSON.stringify(links,null,2))
}
const server=createServer(async (req,res)=>
	// console.log(req.url)
{
	if(req.method==='GET'){
		if(req.url==='/'){
			return serverFile(res,'index.html','text/html')
		}
	
		else if (req.url==='/style.css'){
			return serverFile(res,'style.css','text/css')
		}

		else if(req.url==='/links'){
			const links=await loadlinks()
			res.writeHead(200,{'Content-Type':'application/json'})
		    return res.end(JSON.stringify(links))
		}
		else
		{
			const links=await loadlinks()
			const shortCode=req.url.slice(1);
			if(links[shortCode])
			{
				res.writeHead(302,{location:links[shortCode]})
				 return res.end();
			}
			res.writeHead(404,{'Content-Type':'text/plain'})
		    return res.end("Shortened URL not found")
		}
	}

	if (req.method==='POST' && req.url==='/Shorten')
	{
		const links=await loadlinks()
		let body="";
		req.on('data',(chunk)=>body+=chunk)
		req.on('end',async ()=>{
			const {url,shortCode}=JSON.parse(body)
			if(!url)
			{
				res.writeHead(400,{'Content-Type':'text/plain'})
		        return res.end(" URL is required")
	        }
			const finalshortcode=shortCode || crypto.randomBytes(4).toString('hex')
			if(links[finalshortcode])
			{
				res.writeHead(409,{'Content-Type':'text/plain'})
		        return res.end("Error : shortcode duplicate found")
				
			}
			links[finalshortcode]=url;
			await savelinks(links);
				res.writeHead(200,{'Content-Type':'application/json'})
		        res.end(JSON.stringify({success:true,shortCode:finalshortcode}))
			})
		}
	}
)
server.listen(PORT,()=>{
	console.log(`Server running at http://localhost:${PORT}`)
})