import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { shortLinksTable } from "../drizzle/schema.js";
import { deleteShortCode } from "../controllers/postshorterner.controller.js";

export const getAllShortLinks = async (userId) => {
	
  return await db.select().from(shortLinksTable).where(eq(shortLinksTable.userId,userId));
};

export const getShortLinkByShortCode = async (shortCode) => {
  const [result] = await db
    .select()
    .from(shortLinksTable)
    .where(eq(shortLinksTable.shortCode, shortCode));
  return result;
};

export const insertShortLink = async ({ url, shortCode,userId}) => {
  await db.insert(shortLinksTable).values({ url, shortCode,userId });
};

//!to find shortlinkbyid
export const findShortLinkById=async(id)=>{
	 const [result] = await db
    .select()
    .from(shortLinksTable)
    .where(eq(shortLinksTable.id, id));
	return result
} 

export const deleteShortCodeById=async(id)=>{
	return await db.delete(shortLinksTable).where(eq(shortLinksTable.id,id))
}

export const updateShortCode = async ({ id, url, shortCode }) => {
  return await db
    .update(shortLinksTable)
    .set({ url, shortCode })
    .where(eq(shortLinksTable.id, id));
};