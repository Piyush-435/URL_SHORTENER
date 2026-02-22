import crypto from "crypto";
import {getAllShortLinks,getShortLinkByShortCode,insertShortLink,findShortLinkById,deleteShortCodeById,updateShortCode} from "../services/shortener.services.js";
import { shortnerschema } from "../validators/shortener.validator.js";
import {z} from "zod"
export const getShortenerPage = async (req, res) => {
  try {
	if(!req.user){
		return res.redirect("/login")
	}
    const links = await getAllShortLinks(req.user.id);

    return res.render("index", { links, host: req.host,errors:req.flash('errors')});
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
};

export const postURLShortener = async (req, res) => {
  try {
	if(!req.user){
		return res.redirect("/login")
	}
	const result=shortnerschema.safeParse(req.body)
	if (!result.success) {
       const errors = result.error.issues.map(e => e.message);
      req.flash("errors", errors);
       return res.redirect("/");
}
    const { url, shortCode } = result.data;
    const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

    // const links = await loadLinks();
    const link = await getShortLinkByShortCode(finalShortCode);
    
    if (link) {
    //   return res
    //     .status(400)
   	//     .send("Short code already exists. Please choose another.");
    req.flash("errors","Shortcode already exists with that URL.Please choose another")
    return res.redirect("/")
}

    // links[finalShortCode] = url;

    await insertShortLink({ url, shortCode: finalShortCode,userId:req.user.id});
    return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
};

export const redirectToShortLink = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const link = await getShortLinkByShortCode(shortCode);
    // console.log("🚀 ~ redirectToShortLink ~ li̥nk:", link);

    if (!link) return res.status(404).send("404 error occurred");

    return res.redirect(link.url);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
};


//!this route helps to edit the shortcode
export const  getShortnerEditPage=async(req,res)=>{
	if(!req.user) return res.redirect("/login")
	const {data:id,error}=z.coerce.number().int().safeParse(req.params.id)
if(error) return res.redirect("/404")
	try {
		const shortLink=await findShortLinkById(id);
		if(!shortLink) return res.redirect("/404")

			res.render("edit-shortlink",{
				id:shortLink.id,
				url:shortLink.url,
				shortCode:shortLink.shortCode,
				errors:req.flash("errors")
			})
	} catch (error) {
		console.error(err)
		return res.status(500).send("Internal server error")
	}
}


// postShortenerEditPage
export const postShortenerEditPage = async (req, res) => {
  if (!req.user) return res.redirect("/login");
  // const id = req.params;
  const { data: id, error } = z.coerce.number().int().safeParse(req.params.id);
  if (error) return res.redirect("/404");

  try {
    const { url, shortCode } = req.body;
    const newUpdateShortCode = await updateShortCode({ id, url, shortCode });
    if (!newUpdateShortCode) return res.redirect("/404");

    res.redirect("/");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      req.flash("errors", "Shortcode already exists, please choose another");
      return res.redirect(`/edit/${id}`);
    }

    console.error(err);
    return res.status(500).send("Internal server error");
  }
};

export const deleteShortCode=async(req,res)=>{
if(!req.user) return res.redirect("/login")
	try {
		const {data:id,error}=z.coerce.number().int().safeParse(req.params.id)
		if(error) return res.redirect("/404")
		
			await deleteShortCodeById(id)
			return res.redirect("/")
	} catch (error) {
		console.error(err)
		return res.status(500).send("Internal server error")
	}
}