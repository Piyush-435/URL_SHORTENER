import { relations, sql } from "drizzle-orm";
import { timestamp, int, mysqlTable, varchar, text,boolean, mysqlEnum } from "drizzle-orm/mysql-core";


// Users table
export const usersTable = mysqlTable("USERS", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }),
  isEmailValid:boolean("is_email_valid").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

//User email token table for verifying the email
export const verifyEmailTokensTable=mysqlTable("is_email_valid",{
	id:int().autoincrement().primaryKey(),
	userId:int("user_id").notNull().references(()=>usersTable.id,{onDelete:"cascade"}),
	token:varchar({length:8}).notNull(),
	expiresAt:timestamp("expires_at").default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 DAY )`).notNull(),
	createdAt:timestamp("created_at").defaultNow().notNull(),
	
})




// ShortLinks table
export const shortLinksTable = mysqlTable("short_link", {
  id: int().autoincrement().primaryKey(),
  url: varchar({ length: 255 }).notNull(),
  shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  userId: int("user_id").notNull().references(() => usersTable.id), // <-- FK defined here
});

//creating sessionTable for hybrid authentication

export const sessionsTable=mysqlTable("sessions",{
	id:int().autoincrement().primaryKey(),
	userId:int("user_id").notNull().references(()=> usersTable.id,{onDelete:"cascade"}),
	valid:boolean().default(true).notNull(),
	userAgent:text("user_agent"),
	ip:varchar({length:255}),
	createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

//passwordResetTokensTable
export const passwordResetTokensTable = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at")
    .default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 HOUR)`)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


//oauthAccountsTable
export const oauthAccountsTable = mysqlTable("oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["google", "github"]).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 })
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations

// A user can have multiple shortLinks and multiple session id
export const usersRelation = relations(usersTable, ({ many }) => ({
  shortLinks: many(shortLinksTable), // no extra field/references needed
  session:many(sessionsTable),
}));

// A shortLink belongs to one user
export const shortLinksRelation = relations(shortLinksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [shortLinksTable.userId],
    references: [usersTable.id]
  })
}));
// A session can have only one userid
export const sessionrelations = relations(sessionsTable ,({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id]
  })
}));
