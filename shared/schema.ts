import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  date,
  time,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// This table is mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// This table is mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  isAdmin: boolean("is_admin").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTP verification codes
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  price: integer("price").notNull(), // in cents
  durationDays: integer("duration_days").notNull(),
  description: text("description").notNull(),
  features: text("features").array(),
  isPopular: boolean("is_popular").default(false),
});

// User subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: integer("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game streams
export const streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  gameId: varchar("game_id").notNull().unique(),
  streamUrl: text("stream_url").notNull(),
  awayStreamUrl: text("away_stream_url"),
  isActive: boolean("is_active").default(true),
  addedById: varchar("added_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});





// Leagues metadata
export const leagues = pgTable("leagues", {
  id: varchar("id").primaryKey(), // e.g., nba, nfl, nhl, mlb
  name: varchar("name").notNull(),
  icon: varchar("icon").notNull(),
  backgroundColor: varchar("background_color").notNull(),
  enabled: boolean("enabled").default(true),
});

// Stream sources for managing m3u8 URLs
export const streamSources = pgTable("stream_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  leagueId: varchar("league_id").notNull(),
  priority: integer("priority").default(1),
  teamName: varchar("team_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game alerts
export const gameAlerts = pgTable("game_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameId: varchar("game_id").notNull(),
  notifyMinutesBefore: integer("notify_minutes_before").notNull(),
  isNotified: boolean("is_notified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Network channels for live streaming
export const networkChannels = pgTable("network_channels", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  streamUrl: text("stream_url").notNull(),
  logoUrl: varchar("logo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertStream = typeof streams.$inferInsert;
export type Stream = typeof streams.$inferSelect;

export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect & {
  stripePaymentIntentId?: string;
};

export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type InsertOtp = typeof otpCodes.$inferInsert;
export type Otp = typeof otpCodes.$inferSelect;

export type InsertGameAlert = typeof gameAlerts.$inferInsert;
export type GameAlert = typeof gameAlerts.$inferSelect;

export type InsertStreamSource = typeof streamSources.$inferInsert;
export type StreamSource = typeof streamSources.$inferSelect;

export type InsertNetworkChannel = typeof networkChannels.$inferInsert;
export type NetworkChannel = typeof networkChannels.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertStreamSchema = createInsertSchema(streams);
export const insertStreamSourceSchema = createInsertSchema(streamSources);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const insertOtpSchema = createInsertSchema(otpCodes);
export const insertGameAlertSchema = createInsertSchema(gameAlerts);
export const insertNetworkChannelSchema = createInsertSchema(networkChannels);

// Broadcast information from ESPN API
export interface Broadcast {
  type: string;
  name: string;
  shortName: string;
  callLetters: string;
  isNational: boolean;
  slug: string;
}

// Game data from ESPN API (not stored in database)
export interface Game {
  id: string;
  date: string;
  name: string;
  shortName: string;
  // Enhanced game states:
  // - pre: upcoming game
  // - in: live/in-progress game
  // - post: completed game
  // - delayed: game delayed from scheduled start time
  // - postponed: game postponed/canceled
  state: "pre" | "in" | "post" | "delayed" | "postponed";
  league: "nba" | "nfl" | "nhl" | "mlb";
  // Flags for time-based game categorization
  isTomorrow?: boolean;  // Game is scheduled for tomorrow
  isFuture?: boolean;    // Game is scheduled for future date (beyond tomorrow)
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
    logo: string;
    score?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
    logo: string;
    score?: number;
  };
  venue: {
    name: string;
    city: string;
  };
  status: {
    period: number;
    clock?: string;
    displayClock?: string;
    detail: string;
  };
  // Enhanced broadcast information
  broadcasts?: Broadcast[];
  // ESPN links for additional game info
  links?: {
    gamecast?: string;
    boxScore?: string;
    recap?: string;
  };
}
