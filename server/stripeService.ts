import Stripe from 'stripe';
import { storage } from './storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Create a payment intent for one-time payments
export async function createPaymentIntent(amount: number, currency: string = 'usd', userId?: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: currency,
      metadata: userId ? { userId } : undefined
    });

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Error creating payment intent: ${error.message}`);
  }
}

// Create a new subscription for a user
export async function createSubscription(userId: string, planId: string, paymentMethodId: string) {
  try {
    // Get or create customer
    let customer;
    const user = await storage.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.stripeCustomerId) {
      // Get existing customer
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        payment_method: paymentMethodId
      });

      // Update user with customer ID
      await storage.updateUser(userId, { stripeCustomerId: customer.id });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: typeof customer === 'string' ? customer : customer.id
    });

    // Set as default payment method
    await stripe.customers.update(
      typeof customer === 'string' ? customer : customer.id,
      {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      }
    );

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: typeof customer === 'string' ? customer : customer.id,
      items: [{ price: planId }],
      expand: ['latest_invoice.payment_intent'],
    });

    // Save subscription to database
    await storage.createSubscription({
      userId,
      planId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
    };
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    throw new Error(`Error creating subscription: ${error.message}`);
  }
}

// Cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    throw new Error(`Error canceling subscription: ${error.message}`);
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error: any) {
    console.error('Error retrieving subscription:', error);
    throw new Error(`Error retrieving subscription: ${error.message}`);
  }
}

// Generate a setup intent for saving a payment method
export async function createSetupIntent(userId: string) {
  try {
    const user = await storage.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripeCustomerId;

    // Create customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username
      });

      customerId = customer.id;
      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId
    });

    return {
      clientSecret: setupIntent.client_secret
    };
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    throw new Error(`Error creating setup intent: ${error.message}`);
  }
}

// Create Stripe Checkout Session for off-site payment
export async function createCheckoutSession(userId: string, planId: string, successUrl: string, cancelUrl: string) {
  try {
    const user = await storage.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Define price mapping based on your pricing requirements
    const priceMapping: { [key: string]: { price: number, name: string, interval?: string } } = {
      'monthly': { price: 1999, name: 'Monthly Plan', interval: 'month' }, // $19.99
      'annual': { price: 14999, name: 'Annual Plan', interval: 'year' },   // $149.99
      'free': { price: 0, name: 'Free Plan' }
    };

    const planInfo = priceMapping[planId.toLowerCase()];
    if (!planInfo) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username || user.email,
        metadata: {
          userId: userId
        }
      });

      customerId = customer.id;
      // Update user with Stripe customer ID
      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planInfo.name,
              description: `VeloPlay ${planInfo.name} - Unlimited access to live sports streams`
            },
            unit_amount: planInfo.price,
            recurring: planInfo.interval ? {
              interval: planInfo.interval as 'month' | 'year'
            } : undefined
          },
          quantity: 1
        }
      ],
      mode: planInfo.interval ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planId: planId
      }
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw new Error(`Error creating checkout session: ${error.message}`);
  }
}

// Get all available subscription plans from Stripe
export async function getStripePlans() {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    });

    return prices.data.map(price => ({
      id: price.id,
      productId: typeof price.product === 'string' ? price.product : price.product.id,
      name: typeof price.product === 'string' ? '' : price.product.name,
      description: typeof price.product === 'string' ? '' : price.product.description,
      amount: price.unit_amount ? price.unit_amount / 100 : 0, // Convert cents to dollars
      currency: price.currency,
      interval: price.recurring?.interval || null,
      intervalCount: price.recurring?.interval_count || null
    }));
  } catch (error: any) {
    console.error('Error retrieving subscription plans:', error);
    throw new Error(`Error retrieving subscription plans: ${error.message}`);
  }
}

// Handle Stripe webhook events
export async function handleWebhookEvent(event: any) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    throw new Error(`Error handling webhook event: ${error.message}`);
  }
}

// Helper functions for webhook handling
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { userId } = paymentIntent.metadata || {};
  if (userId) {
    // Update user's payment status in your database
    console.log(`Payment succeeded for user ${userId}`);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription;
  if (typeof subscriptionId === 'string') {
    // Find subscription in your database and update status
    const subscription = await storage.getSubscriptionByStripeId(subscriptionId);
    if (subscription) {
      await storage.updateSubscriptionByStripeId(subscriptionId, {
        status: 'active',
        updatedAt: new Date()
      });
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Update subscription status in your database
  await storage.updateSubscriptionByStripeId(subscription.id, {
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    updatedAt: new Date()
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status in your database
  await storage.updateSubscriptionByStripeId(subscription.id, {
    status: 'canceled',
    updatedAt: new Date()
  });
}
// Handle Stripe webhook with signature verification
export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    return await handleWebhookEvent(event);
  } catch (error: any) {
    console.error('Error handling Stripe webhook:', error);
    throw new Error(`Webhook error: ${error.message}`);
  }
}