import {
  type User,
  type UpsertUser,
  type Stream,
  type InsertStream,
  type Subscription,
  type InsertSubscription,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type Otp,
  type InsertOtp,
  type GameAlert,
  type InsertGameAlert,
  type StreamSource,
  type InsertStreamSource,
} from "@shared/schema";
import { NetworkChannel, NetworkChannelInsert } from "@shared/channelSchema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  users, 
  streams, 
  subscriptions, 
  subscriptionPlans, 
  gameAlerts, 
  networkChannels, 
  streamSources 
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User>;
  updateUserVerificationStatus(id: string, isVerified: boolean): Promise<void>;
  deleteUser(id: string): Promise<void>;
  deleteSubscriptionsByUserId(userId: string): Promise<void>;
  
  // Stream Sources operations
  getAllStreamSources(): Promise<StreamSource[]>;
  getStreamSourceById(id: number): Promise<StreamSource | undefined>;
  createStreamSource(streamSource: InsertStreamSource): Promise<StreamSource>;
  updateStreamSource(id: number, streamSource: Partial<InsertStreamSource>): Promise<StreamSource | undefined>;
  deleteStreamSource(id: number): Promise<boolean>;
  deleteAllStreamSources(): Promise<void>;
  
  // Stream operations
  getStreamByGameId(gameId: string): Promise<Stream | undefined>;
  createStream(stream: InsertStream): Promise<Stream>;
  updateStream(id: number, data: { streamUrl?: string; awayStreamUrl?: string }): Promise<Stream>;
  deleteStream(id: number): Promise<void>;
  getAllStreams(): Promise<Stream[]>;
  
  // Network Channel operations
  getNetworkChannels(): Promise<NetworkChannel[]>;
  getNetworkChannelById(id: number): Promise<NetworkChannel | undefined>;
  createNetworkChannel(channel: NetworkChannelInsert): Promise<NetworkChannel>;
  updateNetworkChannel(id: number, channelData: Partial<NetworkChannelInsert>): Promise<NetworkChannel>;
  deleteNetworkChannel(id: number): Promise<void>;
  
  // Subscription operations
  getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  cancelSubscription(id: number): Promise<void>;
  getAllSubscriptions(): Promise<Subscription[]>;
  adminUpdateSubscription(id: number, data: { isActive?: boolean; endDate?: Date }): Promise<Subscription>;
  
  // Subscription plan operations
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined>;
  
  // Game alert operations
  createGameAlert(alert: InsertGameAlert): Promise<GameAlert>;
  getGameAlertsByUserId(userId: string): Promise<GameAlert[]>;
  getGameAlertByUserAndGame(userId: string, gameId: string): Promise<GameAlert | undefined>;
  getUnsentGameAlerts(): Promise<GameAlert[]>;
  markGameAlertAsSent(id: number): Promise<void>;
  updateGameAlertNotificationStatus(id: number, isNotified: boolean): Promise<GameAlert>;
  deleteGameAlert(id: number): Promise<void>;
  createSubscriptionPlan(plan: Omit<InsertSubscriptionPlan, "id">): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, data: Partial<Omit<InsertSubscriptionPlan, "id">>): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: number): Promise<void>;
  
  // Payment operations
  getSubscriptionByPaymentIntentId(paymentIntentId: string): Promise<Subscription | undefined>;
  
  // League operations
  initializeLeagues(): Promise<void>;
  
  // OTP operations
  createOtp(data: InsertOtp): Promise<Otp>;
  getOtpByUserIdAndCode(userId: string, code: string): Promise<Otp | undefined>;
  markOtpAsUsed(id: number): Promise<void>;
  getActiveOtpsByUserId(userId: string): Promise<Otp[]>;
}

export class NeonStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists
    const existingUser = await this.getUserByEmail(userData.email);
    
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date()
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newUser;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }

  async updateUserVerificationStatus(id: string, isVerified: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        isVerified: isVerified,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async deleteSubscriptionsByUserId(userId: string): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
  }

  // Stream operations
  async getStreamByGameId(gameId: string): Promise<Stream | undefined> {
    const [stream] = await db.select().from(streams).where(eq(streams.gameId, gameId));
    return stream;
  }

  async createStream(stream: InsertStream): Promise<Stream> {
    const [newStream] = await db.insert(streams).values(stream).returning();
    return newStream;
  }

  async updateStream(id: number, data: { streamUrl?: string; awayStreamUrl?: string }): Promise<Stream> {
    const [updatedStream] = await db
      .update(streams)
      .set(data)
      .where(eq(streams.id, id))
      .returning();
    
    if (!updatedStream) {
      throw new Error('Stream not found');
    }
    
    return updatedStream;
  }

  async deleteStream(id: number): Promise<void> {
    await db.delete(streams).where(eq(streams.id, id));
  }

  async getAllStreams(): Promise<Stream[]> {
    return await db.select().from(streams);
  }

  // Subscription operations
  async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async cancelSubscription(id: number): Promise<void> {
    await db
      .update(subscriptions)
      .set({ 
        isActive: false,
        endDate: new Date()
      })
      .where(eq(subscriptions.id, id));
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions);
  }

  async adminUpdateSubscription(id: number, data: { isActive?: boolean; endDate?: Date }): Promise<Subscription> {
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set(data)
      .where(eq(subscriptions.id, id))
      .returning();
    
    if (!updatedSubscription) {
      throw new Error('Subscription not found');
    }
    
    return updatedSubscription;
  }

  // Subscription plan operations
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans);
  }

  async getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async createSubscriptionPlan(plan: Omit<InsertSubscriptionPlan, "id">): Promise<SubscriptionPlan> {
    const [newPlan] = await db.insert(subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  async updateSubscriptionPlan(id: number, data: Partial<Omit<InsertSubscriptionPlan, "id">>): Promise<SubscriptionPlan> {
    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set(data)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    
    if (!updatedPlan) {
      throw new Error('Subscription plan not found');
    }
    
    return updatedPlan;
  }

  async deleteSubscriptionPlan(id: number): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  async getSubscriptionByPaymentIntentId(paymentIntentId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.paymentIntentId, paymentIntentId));
    return subscription;
  }

  // Game alert operations
  async createGameAlert(alert: InsertGameAlert): Promise<GameAlert> {
    const [newAlert] = await db.insert(gameAlerts).values(alert).returning();
    return newAlert;
  }

  async getGameAlertsByUserId(userId: string): Promise<GameAlert[]> {
    return await db.select().from(gameAlerts).where(eq(gameAlerts.userId, userId));
  }

  async getGameAlertByUserAndGame(userId: string, gameId: string): Promise<GameAlert | undefined> {
    const [alert] = await db
      .select()
      .from(gameAlerts)
      .where(and(eq(gameAlerts.userId, userId), eq(gameAlerts.gameId, gameId)));
    return alert;
  }

  async getUnsentGameAlerts(): Promise<GameAlert[]> {
    return await db.select().from(gameAlerts).where(eq(gameAlerts.isSent, false));
  }

  async markGameAlertAsSent(id: number): Promise<void> {
    await db
      .update(gameAlerts)
      .set({ isSent: true })
      .where(eq(gameAlerts.id, id));
  }

  async updateGameAlertNotificationStatus(id: number, isNotified: boolean): Promise<GameAlert> {
    const [updatedAlert] = await db
      .update(gameAlerts)
      .set({ isNotified: isNotified })
      .where(eq(gameAlerts.id, id))
      .returning();
    
    if (!updatedAlert) {
      throw new Error('Game alert not found');
    }
    
    return updatedAlert;
  }

  async deleteGameAlert(id: number): Promise<void> {
    await db.delete(gameAlerts).where(eq(gameAlerts.id, id));
  }

  // Network Channel operations
  async getNetworkChannels(): Promise<NetworkChannel[]> {
    return await db.select().from(networkChannels);
  }

  async getNetworkChannelById(id: number): Promise<NetworkChannel | undefined> {
    const [channel] = await db.select().from(networkChannels).where(eq(networkChannels.id, id));
    return channel;
  }

  async createNetworkChannel(channel: NetworkChannelInsert): Promise<NetworkChannel> {
    const [newChannel] = await db.insert(networkChannels).values(channel).returning();
    return newChannel;
  }

  async updateNetworkChannel(id: number, channelData: Partial<NetworkChannelInsert>): Promise<NetworkChannel> {
    const [updatedChannel] = await db
      .update(networkChannels)
      .set(channelData)
      .where(eq(networkChannels.id, id))
      .returning();
    
    if (!updatedChannel) {
      throw new Error('Network channel not found');
    }
    
    return updatedChannel;
  }

  async deleteNetworkChannel(id: number): Promise<void> {
    await db.delete(networkChannels).where(eq(networkChannels.id, id));
  }

  // Stream Sources operations
  async getAllStreamSources(): Promise<StreamSource[]> {
    return await db.select().from(streamSources);
  }

  async getStreamSourceById(id: number): Promise<StreamSource | undefined> {
    const [source] = await db.select().from(streamSources).where(eq(streamSources.id, id));
    return source;
  }

  async createStreamSource(streamSource: InsertStreamSource): Promise<StreamSource> {
    const [newSource] = await db.insert(streamSources).values(streamSource).returning();
    return newSource;
  }

  async updateStreamSource(id: number, streamSource: Partial<InsertStreamSource>): Promise<StreamSource | undefined> {
    const [updatedSource] = await db
      .update(streamSources)
      .set(streamSource)
      .where(eq(streamSources.id, id))
      .returning();
    
    return updatedSource;
  }

  async deleteStreamSource(id: number): Promise<boolean> {
    const result = await db.delete(streamSources).where(eq(streamSources.id, id));
    return result.rowCount > 0;
  }

  async deleteAllStreamSources(): Promise<void> {
    await db.delete(streamSources);
  }

  // League operations
  async initializeLeagues(): Promise<void> {
    // This is typically handled by database migrations
    // Keep empty for compatibility
  }

  // OTP operations (simplified for now)
  async createOtp(data: InsertOtp): Promise<Otp> {
    // For now, return a mock OTP until we implement the OTP table
    throw new Error('OTP operations not yet implemented in Neon migration');
  }

  async getOtpByUserIdAndCode(userId: string, code: string): Promise<Otp | undefined> {
    // For now, return undefined until we implement the OTP table
    return undefined;
  }

  async markOtpAsUsed(id: number): Promise<void> {
    // For now, do nothing until we implement the OTP table
  }

  async getActiveOtpsByUserId(userId: string): Promise<Otp[]> {
    // For now, return empty array until we implement the OTP table
    return [];
  }
}

export const storage = new NeonStorage();