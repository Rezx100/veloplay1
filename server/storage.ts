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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) return undefined;
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImageUrl: data.profile_image_url,
      isAdmin: data.is_admin,
      isVerified: data.is_verified,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as User;
  }
  
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error || !data) return undefined;
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImageUrl: data.profile_image_url,
      isAdmin: data.is_admin,
      isVerified: data.is_verified,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Convert from camelCase to snake_case
    const user = {
      id: userData.id,
      email: userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
      profile_image_url: userData.profileImageUrl,
      is_admin: userData.isAdmin,
      is_verified: userData.isVerified,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .upsert(user)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImageUrl: data.profile_image_url,
      isAdmin: data.is_admin,
      isVerified: data.is_verified,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as User;
  }
  
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*');
      
    if (error) throw error;
    
    // Convert from snake_case to camelCase
    return data.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.profile_image_url,
      isAdmin: user.is_admin,
      createdAt: user.created_at ? new Date(user.created_at) : new Date(),
      updatedAt: user.updated_at ? new Date(user.updated_at) : new Date()
    })) as User[];
  }
  
  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    // Convert from camelCase to snake_case
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.firstName !== undefined) updateData.first_name = userData.firstName;
    if (userData.lastName !== undefined) updateData.last_name = userData.lastName;
    if (userData.profileImageUrl !== undefined) updateData.profile_image_url = userData.profileImageUrl;
    if (userData.isAdmin !== undefined) updateData.is_admin = userData.isAdmin;
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      profileImageUrl: data.profile_image_url,
      isAdmin: data.is_admin,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as User;
  }
  
  async updateUserVerificationStatus(id: string, isVerified: boolean): Promise<void> {
    const updateData = { 
      is_verified: isVerified,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id);
      
    if (error) {
      console.error("Error updating user verification status:", error);
      throw new Error(`Failed to update verification status: ${error.message}`);
    }
  }
  
  async deleteUser(id: string): Promise<void> {
    try {
      // Get user information before deleting (to get the email)
      const user = await this.getUser(id);
      if (!user) {
        throw new Error("User not found");
      }
      
      console.log(`[USER DELETION] Starting deletion process for user ${id} (${user.email})`);
      
      // First delete from the database table
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
        
      if (dbError) {
        console.error("[USER DELETION] Error deleting user from database:", dbError);
        throw new Error(`Failed to delete user from database: ${dbError.message}`);
      }
      
      console.log(`[USER DELETION] Successfully removed user from application database: ${id}`);
      
      // Try multiple approaches to delete the user from Supabase Auth
      let authDeletionSuccess = false;
      
      // Approach 1: Use the admin API - most reliable when properly configured
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) {
          console.error("[USER DELETION] Error using admin.deleteUser:", authError);
        } else {
          console.log(`[USER DELETION] Successfully deleted user from auth using admin API: ${id}`);
          authDeletionSuccess = true;
        }
      } catch (authError) {
        console.error("[USER DELETION] Failed to use admin.deleteUser:", authError);
      }
      
      // Approach 2: If approach 1 failed, try to use direct SQL connection if DATABASE_URL is available
      if (!authDeletionSuccess && process.env.DATABASE_URL) {
        try {
          console.log(`[USER DELETION] Attempting direct database connection for user ${id}`);
          
          // Use node-postgres to connect directly
          const { Pool } = require('pg');
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
          });
          
          // Delete the user from auth.users table
          await pool.query('DELETE FROM auth.users WHERE id = $1', [id]);
          
          // Close the connection
          await pool.end();
          
          console.log(`[USER DELETION] Successfully deleted user from Supabase using direct SQL: ${id}`);
          authDeletionSuccess = true;
        } catch (sqlError) {
          console.error("[USER DELETION] SQL deletion error:", sqlError);
        }
      }
      
      // Approach 3: If both approaches failed, at least invalidate all sessions
      try {
        await supabase.auth.admin.signOut(id);
        console.log(`[USER DELETION] Successfully signed out all user sessions: ${id}`);
      } catch (signOutError) {
        console.error("[USER DELETION] Failed to sign out user sessions:", signOutError);
      }
      
      console.log(`[USER DELETION] User ${id} (${user.email}) deletion process completed. Auth deletion success: ${authDeletionSuccess}`);
    } catch (error) {
      console.error("[USER DELETION] User deletion error:", error);
      throw error;
    }
  }
  
  async deleteSubscriptionsByUserId(userId: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error deleting user subscriptions:", error);
      throw new Error(`Failed to delete user subscriptions: ${error.message}`);
    }
  }

  // Stream operations
  async getStreamByGameId(gameId: string): Promise<Stream | undefined> {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .eq('game_id', gameId)
      .single();
      
    if (error || !data) return undefined;
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      gameId: data.game_id,
      streamUrl: data.stream_url,
      awayStreamUrl: data.away_stream_url,
      isActive: data.is_active,
      addedById: data.added_by_id,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as Stream;
  }

  async createStream(stream: InsertStream): Promise<Stream> {
    // Convert from camelCase to snake_case
    const streamData = {
      game_id: stream.gameId,
      stream_url: stream.streamUrl,
      away_stream_url: stream.awayStreamUrl,
      is_active: stream.isActive,
      added_by_id: stream.addedById
    };
    
    const { data, error } = await supabase
      .from('streams')
      .insert(streamData)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: data.id,
      gameId: data.game_id,
      streamUrl: data.stream_url,
      awayStreamUrl: data.away_stream_url,
      isActive: data.is_active,
      addedById: data.added_by_id,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as Stream;
  }

  async updateStream(id: number, data: { streamUrl?: string; awayStreamUrl?: string }): Promise<Stream> {
    // Convert from camelCase to snake_case
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (data.streamUrl !== undefined) updateData.stream_url = data.streamUrl;
    if (data.awayStreamUrl !== undefined) updateData.away_stream_url = data.awayStreamUrl;
    
    const { data: updatedStream, error } = await supabase
      .from('streams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: updatedStream.id,
      gameId: updatedStream.game_id,
      streamUrl: updatedStream.stream_url,
      awayStreamUrl: updatedStream.away_stream_url,
      isActive: updatedStream.is_active,
      addedById: updatedStream.added_by_id,
      createdAt: updatedStream.created_at ? new Date(updatedStream.created_at) : new Date(),
      updatedAt: updatedStream.updated_at ? new Date(updatedStream.updated_at) : new Date()
    } as Stream;
  }

  async deleteStream(id: number): Promise<void> {
    const { error } = await supabase
      .from('streams')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  async getAllStreams(): Promise<Stream[]> {
    const { data, error } = await supabase
      .from('streams')
      .select('*');
      
    if (error) throw error;
    
    // Convert from snake_case to camelCase
    return data.map(stream => ({
      id: stream.id,
      gameId: stream.game_id,
      streamUrl: stream.stream_url,
      awayStreamUrl: stream.away_stream_url,
      isActive: stream.is_active,
      addedById: stream.added_by_id,
      createdAt: stream.created_at ? new Date(stream.created_at) : new Date(),
      updatedAt: stream.updated_at ? new Date(stream.updated_at) : new Date()
    })) as Stream[];
  }

  // Subscription operations
  async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('end_date', now)
      .single();
      
    if (error || !data) return undefined;
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      startDate: data.start_date ? new Date(data.start_date) : new Date(),
      endDate: data.end_date ? new Date(data.end_date) : new Date(),
      isActive: data.is_active,
      createdAt: data.created_at ? new Date(data.created_at) : new Date()
    } as Subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    // Convert from camelCase to snake_case
    const subscriptionData = {
      user_id: subscription.userId,
      plan_id: subscription.planId,
      start_date: subscription.startDate?.toISOString(),
      end_date: subscription.endDate?.toISOString(),
      is_active: subscription.isActive
    };
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      startDate: data.start_date ? new Date(data.start_date) : new Date(),
      endDate: data.end_date ? new Date(data.end_date) : new Date(),
      isActive: data.is_active,
      createdAt: data.created_at ? new Date(data.created_at) : new Date()
    } as Subscription;
  }

  async cancelSubscription(id: number): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async getAllSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*');
      
    if (error) throw error;
    
    // Convert from snake_case to camelCase
    return data.map(sub => ({
      id: sub.id,
      userId: sub.user_id,
      planId: sub.plan_id,
      startDate: sub.start_date ? new Date(sub.start_date) : new Date(),
      endDate: sub.end_date ? new Date(sub.end_date) : new Date(),
      isActive: sub.is_active,
      createdAt: sub.created_at ? new Date(sub.created_at) : new Date()
    })) as Subscription[];
  }
  
  async adminUpdateSubscription(id: number, data: { isActive?: boolean; endDate?: Date }): Promise<Subscription> {
    // Convert from camelCase to snake_case
    const updateData: any = {};
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.endDate) updateData.end_date = data.endDate.toISOString();
    
    const { data: updatedSub, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: updatedSub.id,
      userId: updatedSub.user_id,
      planId: updatedSub.plan_id,
      startDate: updatedSub.start_date ? new Date(updatedSub.start_date) : new Date(),
      endDate: updatedSub.end_date ? new Date(updatedSub.end_date) : new Date(),
      isActive: updatedSub.is_active,
      createdAt: updatedSub.created_at ? new Date(updatedSub.created_at) : new Date()
    } as Subscription;
  }

  // Subscription plan operations
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*');
      
    if (error) throw error;
    
    // Convert from snake_case to camelCase
    return data.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      durationDays: plan.duration_days,
      description: plan.description,
      features: plan.features,
      isPopular: plan.is_popular
    })) as SubscriptionPlan[];
  }
  
  async createSubscriptionPlan(plan: Omit<InsertSubscriptionPlan, "id">): Promise<SubscriptionPlan> {
    // Convert from camelCase to snake_case
    const planData = {
      name: plan.name,
      price: plan.price,
      duration_days: plan.durationDays,
      description: plan.description,
      features: plan.features,
      is_popular: plan.isPopular
    };
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(planData)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      durationDays: data.duration_days,
      description: data.description,
      features: data.features,
      isPopular: data.is_popular
    } as SubscriptionPlan;
  }
  
  async updateSubscriptionPlan(id: number, data: Partial<Omit<InsertSubscriptionPlan, "id">>): Promise<SubscriptionPlan> {
    // Convert from camelCase to snake_case
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.durationDays !== undefined) updateData.duration_days = data.durationDays;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.features !== undefined) updateData.features = data.features;
    if (data.isPopular !== undefined) updateData.is_popular = data.isPopular;
    
    const { data: updatedPlan, error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: updatedPlan.id,
      name: updatedPlan.name,
      price: updatedPlan.price,
      durationDays: updatedPlan.duration_days,
      description: updatedPlan.description,
      features: updatedPlan.features,
      isPopular: updatedPlan.is_popular
    } as SubscriptionPlan;
  }
  
  async deleteSubscriptionPlan(id: number): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select()
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No records found
        return undefined;
      }
      throw error;
    }
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      durationDays: data.duration_days,
      description: data.description,
      features: data.features,
      isPopular: data.is_popular
    } as SubscriptionPlan;
  }
  
  async getSubscriptionByPaymentIntentId(paymentIntentId: string): Promise<Subscription | undefined> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No records found
        return undefined;
      }
      throw error;
    }
    
    if (!data) return undefined;
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      startDate: new Date(data.start_date),
      endDate: new Date(data.expires_at), // Map expires_at to endDate
      isActive: data.status === 'active', // Map status to isActive
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    } as unknown as Subscription;
  }

  // League operations
  async initializeLeagues(): Promise<void> {
    try {
      // Check if leagues table exists and has data
      const { data: existingLeagues, error: checkError } = await supabase
        .from('leagues')
        .select('id');
      
      if (checkError) {
        console.error("Error checking leagues table:", checkError);
        // This is expected if the table doesn't exist yet
        console.log("Will attempt to create leagues table via SQL Editor");
        return;
      }
      
      if (!existingLeagues || existingLeagues.length === 0) {
        const defaultLeagues = [
          { 
            id: 'nhl', 
            name: 'NHL', 
            icon: 'fa-hockey-puck', 
            background_color: '#0033A0',
            enabled: true
          },
          { 
            id: 'nba', 
            name: 'NBA', 
            icon: 'fa-basketball-ball', 
            background_color: '#C9082A',
            enabled: true
          },
          { 
            id: 'nfl', 
            name: 'NFL', 
            icon: 'fa-football-ball', 
            background_color: '#013369',
            enabled: true
          },
          { 
            id: 'mlb', 
            name: 'MLB', 
            icon: 'fa-baseball-ball', 
            background_color: '#002D72',
            enabled: true
          }
        ];
        
        const { error: insertError } = await supabase
          .from('leagues')
          .upsert(defaultLeagues, { onConflict: 'id' });
          
        if (insertError) {
          console.error("Error initializing leagues:", insertError);
        } else {
          console.log("Successfully initialized leagues");
        }
      } else {
        console.log("Leagues already initialized");
      }
    } catch (error) {
      console.error("Exception in initializeLeagues:", error);
    }
  }
  
  // OTP operations
  async createOtp(data: InsertOtp): Promise<Otp> {
    const { data: otp, error } = await supabase
      .from('otp_codes')
      .insert(data)
      .select()
      .single();
      
    if (error) {
      console.error("Error creating OTP:", error);
      throw new Error(`Failed to create OTP: ${error.message}`);
    }
    
    return otp;
  }
  
  async getOtpByUserIdAndCode(userId: string, code: string): Promise<Otp | undefined> {
    const { data: otp, error } = await supabase
      .from('otp_codes')
      .select()
      .eq('userId', userId)
      .eq('code', code)
      .eq('isUsed', false)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // no rows returned
        return undefined;
      }
      console.error("Error fetching OTP:", error);
      throw new Error(`Failed to fetch OTP: ${error.message}`);
    }
    
    return otp;
  }
  
  async markOtpAsUsed(id: number): Promise<void> {
    const { error } = await supabase
      .from('otp_codes')
      .update({ isUsed: true })
      .eq('id', id);
      
    if (error) {
      console.error("Error marking OTP as used:", error);
      throw new Error(`Failed to mark OTP as used: ${error.message}`);
    }
  }
  
  async getActiveOtpsByUserId(userId: string): Promise<Otp[]> {
    const now = new Date();
    
    const { data: otps, error } = await supabase
      .from('otp_codes')
      .select()
      .eq('userId', userId)
      .eq('isUsed', false)
      .gt('expiresAt', now.toISOString());
      
    if (error) {
      console.error("Error fetching active OTPs:", error);
      throw new Error(`Failed to fetch active OTPs: ${error.message}`);
    }
    
    return otps || [];
  }

  // Game Alert operations
  async createGameAlert(alert: InsertGameAlert): Promise<GameAlert> {
    // Check if alert already exists first
    const existingAlert = await this.getGameAlertByUserAndGame(alert.userId, alert.gameId);
    if (existingAlert) {
      console.log('✅ Alert already exists, returning existing alert:', existingAlert);
      return existingAlert;
    }
    
    // Create alert using Supabase directly (without ID, let Supabase auto-generate)
    console.log('📝 Creating game alert using Supabase client');
    
    // Generate a unique ID for the alert
    const alertId = Date.now();
    
    const { data, error } = await supabase
      .from('game_alerts')
      .insert({
        id: alertId,
        user_id: alert.userId,
        game_id: alert.gameId,
        notify_minutes_before: alert.notifyMinutesBefore || 30,
        is_notified: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error creating alert:', error);
      throw new Error(`Failed to create game alert: ${error.message}`);
    }
    
    console.log('✅ Alert created successfully:', data);
    
    // Convert snake_case to camelCase for return
    return {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      notifyMinutesBefore: data.notify_minutes_before,
      isNotified: data.is_notified,
      createdAt: data.created_at
    };
  }

  async getGameAlertsByUserId(userId: string): Promise<GameAlert[]> {
    const { data, error } = await supabase
      .from('game_alerts')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error fetching game alerts:", error);
      throw new Error(`Failed to fetch game alerts: ${error.message}`);
    }
    
    // Convert from snake_case to camelCase
    return (data || []).map(alert => ({
      id: alert.id,
      userId: alert.user_id,
      gameId: alert.game_id,
      notifyMinutesBefore: alert.notify_minutes_before,
      isNotified: alert.is_notified,
      createdAt: alert.created_at ? new Date(alert.created_at) : new Date()
    })) as GameAlert[];
  }

  async getGameAlertByUserAndGame(userId: string, gameId: string): Promise<GameAlert | undefined> {
    const { data, error } = await supabase
      .from('game_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned (not found)
        return undefined;
      }
      
      console.error("Error fetching game alert:", error);
      throw new Error(`Failed to fetch game alert: ${error.message}`);
    }
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      notifyMinutesBefore: data.notify_minutes_before,
      isNotified: data.is_notified,
      createdAt: data.created_at ? new Date(data.created_at) : new Date()
    } as GameAlert;
  }

  async updateGameAlertNotificationStatus(id: number, isNotified: boolean): Promise<GameAlert> {
    const { data, error } = await supabase
      .from('game_alerts')
      .update({ is_notified: isNotified })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating game alert notification status:", error);
      throw new Error(`Failed to update game alert notification status: ${error.message}`);
    }
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      gameId: data.game_id,
      notifyMinutesBefore: data.notify_minutes_before,
      isNotified: data.is_notified,
      createdAt: data.created_at ? new Date(data.created_at) : new Date()
    } as GameAlert;
  }

  async deleteGameAlert(id: number): Promise<void> {
    const { error } = await supabase
      .from('game_alerts')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error("Error deleting game alert:", error);
      throw new Error(`Failed to delete game alert: ${error.message}`);
    }
  }
  
  // Network Channel operations
  async getNetworkChannels(): Promise<NetworkChannel[]> {
    const { data, error } = await supabase
      .from('network_channels')
      .select('*')
      .order('id', { ascending: true });
      
    if (error) {
      console.error("Error fetching network channels:", error);
      throw error;
    }
    
    // Convert from snake_case to camelCase
    return data.map(channel => ({
      id: channel.id,
      name: channel.name,
      icon: channel.icon,
      description: channel.description,
      isActive: channel.is_active,
      isPremium: channel.is_premium,
      createdAt: channel.created_at ? new Date(channel.created_at) : new Date(),
      updatedAt: channel.updated_at ? new Date(channel.updated_at) : new Date()
    })) as NetworkChannel[];
  }
  
  async getNetworkChannelById(id: number): Promise<NetworkChannel | undefined> {
    const { data, error } = await supabase
      .from('network_channels')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) return undefined;
    
    // Convert from snake_case to camelCase
    return {
      id: data.id,
      name: data.name,
      icon: data.icon,
      description: data.description,
      isActive: data.is_active,
      isPremium: data.is_premium,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as NetworkChannel;
  }
  
  async createNetworkChannel(channel: NetworkChannelInsert): Promise<NetworkChannel> {
    // Convert from camelCase to snake_case
    const channelData = {
      id: channel.id, // Use the provided ID (important for stream URL generation)
      name: channel.name,
      icon: channel.icon,
      description: channel.description,
      is_active: channel.isActive !== undefined ? channel.isActive : true,
      is_premium: channel.isPremium !== undefined ? channel.isPremium : false
    };
    
    const { data, error } = await supabase
      .from('network_channels')
      .insert(channelData)
      .select()
      .single();
      
    if (error) {
      console.error("Error creating network channel:", error);
      throw error;
    }
    
    // Convert back to camelCase
    return {
      id: data.id,
      name: data.name,
      icon: data.icon,
      description: data.description,
      isActive: data.is_active,
      isPremium: data.is_premium,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as NetworkChannel;
  }
  
  async updateNetworkChannel(id: number, channelData: Partial<NetworkChannelInsert>): Promise<NetworkChannel> {
    // Convert from camelCase to snake_case
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (channelData.name !== undefined) updateData.name = channelData.name;
    if (channelData.icon !== undefined) updateData.icon = channelData.icon;
    if (channelData.description !== undefined) updateData.description = channelData.description;
    if (channelData.isActive !== undefined) updateData.is_active = channelData.isActive;
    if (channelData.isPremium !== undefined) updateData.is_premium = channelData.isPremium;
    if (channelData.id !== undefined) updateData.id = channelData.id; // Allow changing the ID
    
    const { data, error } = await supabase
      .from('network_channels')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating network channel:", error);
      throw error;
    }
    
    // Convert back to camelCase
    return {
      id: data.id,
      name: data.name,
      icon: data.icon,
      description: data.description,
      isActive: data.is_active,
      isPremium: data.is_premium,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as NetworkChannel;
  }
  
  async deleteNetworkChannel(id: number): Promise<void> {
    const { error } = await supabase
      .from('network_channels')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error("Error deleting network channel:", error);
      throw error;
    }
  }
  
  /* Stream Sources API - for m3u8 URL management */
  async getAllStreamSources(): Promise<StreamSource[]> {
    const { data, error } = await supabase
      .from('stream_sources')
      .select('*')
      .order('id', { ascending: true });
      
    if (error) throw error;
    
    return data.map(source => ({
      id: source.id,
      name: source.name,
      url: source.url,
      description: source.description,
      isActive: source.is_active,
      leagueId: source.league_id,
      priority: source.priority,
      teamName: source.team_name,
      createdAt: source.created_at ? new Date(source.created_at) : new Date(),
      updatedAt: source.updated_at ? new Date(source.updated_at) : new Date()
    } as StreamSource));
  }
  
  async getStreamSourceById(id: number): Promise<StreamSource | undefined> {
    const { data, error } = await supabase
      .from('stream_sources')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      url: data.url,
      description: data.description,
      isActive: data.is_active,
      leagueId: data.league_id,
      priority: data.priority,
      teamName: data.team_name,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as StreamSource;
  }
  
  async createStreamSource(streamSource: InsertStreamSource): Promise<StreamSource> {
    // Convert from camelCase to snake_case
    const streamSourceData = {
      name: streamSource.name,
      url: streamSource.url,
      description: streamSource.description,
      is_active: streamSource.isActive,
      league_id: streamSource.leagueId,
      priority: streamSource.priority || 1,
      team_name: streamSource.teamName
    };
    
    const { data, error } = await supabase
      .from('stream_sources')
      .insert(streamSourceData)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: data.id,
      name: data.name,
      url: data.url,
      description: data.description,
      isActive: data.is_active,
      leagueId: data.league_id,
      priority: data.priority,
      teamName: data.team_name,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as StreamSource;
  }
  
  async updateStreamSource(id: number, streamSource: Partial<InsertStreamSource>): Promise<StreamSource | undefined> {
    // Check if the stream source exists
    const existingSource = await this.getStreamSourceById(id);
    if (!existingSource) return undefined;
    
    // Convert from camelCase to snake_case
    const streamSourceData: Record<string, any> = {};
    if (streamSource.name !== undefined) streamSourceData.name = streamSource.name;
    if (streamSource.url !== undefined) streamSourceData.url = streamSource.url;
    if (streamSource.description !== undefined) streamSourceData.description = streamSource.description;
    if (streamSource.isActive !== undefined) streamSourceData.is_active = streamSource.isActive;
    if (streamSource.leagueId !== undefined) streamSourceData.league_id = streamSource.leagueId;
    if (streamSource.priority !== undefined) streamSourceData.priority = streamSource.priority;
    if (streamSource.teamName !== undefined) streamSourceData.team_name = streamSource.teamName;
    
    streamSourceData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('stream_sources')
      .update(streamSourceData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Convert back to camelCase
    return {
      id: data.id,
      name: data.name,
      url: data.url,
      description: data.description,
      isActive: data.is_active,
      leagueId: data.league_id,
      priority: data.priority,
      teamName: data.team_name,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
    } as StreamSource;
  }
  
  async deleteStreamSource(id: number): Promise<boolean> {
    // Check if the stream source exists
    const existingSource = await this.getStreamSourceById(id);
    if (!existingSource) return false;
    
    const { error } = await supabase
      .from('stream_sources')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return true;
  }
  
  async deleteAllStreamSources(): Promise<void> {
    const { error } = await supabase
      .from('stream_sources')
      .delete()
      .gte('id', 0); // Delete all records
      
    if (error) {
      console.error('Error deleting all stream sources:', error);
      throw new Error('Failed to delete all stream sources');
    }
  }
  /* End of Stream Sources API */

  // Additional Game Alert methods
  async getUnsentGameAlerts(): Promise<GameAlert[]> {
    const { data, error } = await supabase
      .from('game_alerts')
      .select('*')
      .eq('is_notified', false);
      
    if (error) {
      console.error("Error fetching unsent game alerts:", error);
      throw new Error(`Failed to fetch unsent game alerts: ${error.message}`);
    }
    
    return data.map(alert => ({
      id: alert.id,
      userId: alert.user_id,
      gameId: alert.game_id,
      notifyMinutesBefore: alert.notify_minutes_before,
      isNotified: alert.is_notified,
      createdAt: alert.created_at ? new Date(alert.created_at) : new Date()
    })) as GameAlert[];
  }

  async markGameAlertAsSent(id: number): Promise<void> {
    const { error } = await supabase
      .from('game_alerts')
      .update({ is_notified: true })
      .eq('id', id);
      
    if (error) {
      console.error("Error marking game alert as sent:", error);
      throw new Error(`Failed to mark game alert as sent: ${error.message}`);
    }
  }
}

export const storage = new DatabaseStorage();
