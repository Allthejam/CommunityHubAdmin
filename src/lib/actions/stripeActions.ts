
'use server';

import 'dotenv/config';
import Stripe from 'stripe';
import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { createOrderAction } from '@/lib/actions/orderActions';
import { submitAdvertForApprovalAction } from '@/lib/actions/advertActions';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!webhookSecret) {
    console.error('Stripe webhook secret is not set.');
}

type ActionResponse = {
    url?: string | null;
    error?: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

type CheckoutParams = {
    uid: string;
    email: string;
    name: string;
    priceId?: string;
    purchaseType?: 'additional_advert' | 'additional_event' | 'listing_subscription' | 'storefront_subscription' | 'enterprise_subscription' | 'cart_checkout' | 'national_advert_campaign';
    cartItems?: CartItem[];
    price?: number; 
    productName?: string;
    mode: 'subscription' | 'payment';
    successUrlPath: string;
    cancelUrlPath?: string;
    metadata?: Record<string, string>;
}

export async function createCheckoutSession(params: CheckoutParams): Promise<ActionResponse> {
    const { uid, email, name, priceId, purchaseType, cartItems, price, productName, mode, successUrlPath, cancelUrlPath, metadata } = params;
    
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: 'Stripe is not configured on the server. Please contact support.' };
    }

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const { firestore } = initializeAdminApp();
        const userRef = firestore.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        let stripeCustomerId = userData?.stripeCustomerId;

        if (!stripeCustomerId) {
            console.log(`Creating new Stripe customer for user ${uid}`);
            const customer = await stripe.customers.create({
                email: email,
                name: name,
                metadata: {
                    firebaseUID: uid,
                },
            });
            stripeCustomerId = customer.id;
            await userRef.update({ stripeCustomerId: stripeCustomerId });
            console.log(`Stripe customer ${stripeCustomerId} created and linked to user ${uid}.`);
        } else {
            console.log(`Using existing Stripe customer ID: ${stripeCustomerId}`);
        }

        let finalPriceId = priceId;

        if (!finalPriceId && purchaseType) {
            switch (purchaseType) {
                case 'additional_advert':
                    finalPriceId = process.env.STRIPE_BUSINESS_ADVERT_PRICE_ID;
                    break;
                case 'additional_event':
                    finalPriceId = process.env.STRIPE_BUSINESS_EVENT_PRICE_ID;
                    break;
                case 'listing_subscription':
                    finalPriceId = process.env.STRIPE_BUSINESS_PRICE_ID;
                    break;
                case 'storefront_subscription':
                    finalPriceId = process.env.STRIPE_STOREFRONT_PRICE_ID;
                    break;
                case 'enterprise_subscription':
                    finalPriceId = process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID;
                    break;
            }
        }

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

        if (cartItems && cartItems.length > 0) {
            for (const item of cartItems) {
                lineItems.push({
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: item.name,
                        },
                        unit_amount: Math.round(item.price * 100),
                    },
                    quantity: item.quantity,
                });
            }
        } else if (finalPriceId) {
            lineItems.push({
                price: finalPriceId,
                quantity: 1,
            });
        } else if (mode === 'payment' && price && productName) {
            lineItems.push({
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: productName,
                    },
                    unit_amount: Math.round(price * 100),
                },
                quantity: 1,
            });
        } else {
            return { error: 'Invalid checkout session parameters. A price ID or product details are required.' };
        }

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            mode: mode,
            customer: stripeCustomerId,
            line_items: lineItems,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}${successUrlPath}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}${cancelUrlPath || '/'}`,
            metadata: metadata,
        };

        if (mode === 'subscription' && metadata?.businessId) {
            const businessDoc = await firestore.collection('businesses').doc(metadata.businessId).get();
            const businessData = businessDoc.data();
            const communityId = businessData?.primaryCommunityId;

            if (communityId) {
                const communityDoc = await firestore.collection('communities').doc(communityId).get();
                const communityData = communityDoc.data();
                const leaderStripeAccountId = communityData?.stripeAccountId;
                const revenueShare = communityData?.revenueShare;

                if (leaderStripeAccountId && revenueShare > 0) {
                    sessionParams.subscription_data = {
                        transfer_data: {
                            destination: leaderStripeAccountId,
                            amount_percent: revenueShare,
                        },
                    };
                    console.log(`Setting up transfer_data for subscription. Destination: ${leaderStripeAccountId}, Percent: ${revenueShare}`);
                }
            }
        }

        if (mode === 'payment' && purchaseType === 'cart_checkout' && metadata?.cartItems) {
            const parsedCartItems = JSON.parse(metadata.cartItems);
            const businessIds = [...new Set(parsedCartItems.map((item: any) => item.businessId))];
    
            if (businessIds.length === 1) {
                const businessId = businessIds[0];
                const businessDoc = await firestore.collection('businesses').doc(businessId).get();
                const stripeAccountId = businessDoc.data()?.stripeAccountId;
    
                if (stripeAccountId) {
                    const account = await stripe.accounts.retrieve(stripeAccountId);
                    
                    if (account.payouts_enabled) {
                        console.log(`Account ${stripeAccountId} is enabled for payouts. Creating destination charge.`);
                        
                        const totalAmount = parsedCartItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
                        const totalAmountInSmallestUnit = Math.round(totalAmount * 100);

                        // Platform takes a 15% fee
                        const platformFeePercentage = 0.15;
                        const amountToTransfer = Math.floor(totalAmountInSmallestUnit * (1 - platformFeePercentage));

                        sessionParams.payment_intent_data = {
                            transfer_data: {
                                destination: stripeAccountId,
                                amount: amountToTransfer,
                            },
                        };
                    } else {
                        console.log(`Stripe account ${stripeAccountId} not enabled for payouts. Platform will hold funds for business ${businessId}.`);
                    }
                } else {
                    console.log(`Business ${businessId} has no Stripe account connected. Platform will hold funds.`);
                }
            } else if (businessIds.length > 1) {
                console.log('Cart contains items from multiple businesses. Platform will receive full payment and funds must be transferred manually.');
            }
        }


        console.log(`Creating Stripe checkout session for customer ${stripeCustomerId}`);
        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log(`Successfully created checkout session: ${session.id}`);
        return { url: session.url };

    } catch (error: any) {
        console.error("Stripe checkout session creation failed:", error);
        if (error.type === 'StripeInvalidRequestError') {
             return { error: `There was an issue with the request to Stripe: ${error.message}` };
        }
        return { error: `An unexpected error occurred while contacting the payment provider. Details: ${error.message}` };
    }
}

export async function createCustomerPortalLink(params: { userId: string, returnPath: string }): Promise<ActionResponse> {
  const { userId, returnPath } = params;
  
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Stripe is not configured on the server. Please contact support.' };
  }
  
  if (!userId) {
    return { error: "User ID is required to create a billing portal link." };
  }
  
  try {
     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
     const { firestore } = initializeAdminApp();
     const userDoc = await firestore.collection('users').doc(userId).get();
     const stripeCustomerId = userDoc.data()?.stripeCustomerId;

     if (!stripeCustomerId) {
        return { error: 'Stripe customer ID not found for this user.' };
     }

     const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}${returnPath}`,
     });

    return { url: portalSession.url };
  } catch (error: any) {
    console.error("Stripe portal link error:", error);
    return { error: error.message };
  }
}

export async function createStripeConnectAccountLinkForBusiness(businessId: string): Promise<ActionResponse> {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: 'Stripe is not configured on the server. Please contact support.' };
    }

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const { firestore } = initializeAdminApp();
        const businessRef = firestore.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();
        let stripeAccountId = businessDoc.data()?.stripeAccountId;

        if (!stripeAccountId) {
            const account = await stripe.accounts.create({ 
                type: 'express',
            });
            stripeAccountId = account.id;
            await businessRef.update({ stripeAccountId: stripeAccountId });
        }

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/business/storefront?reauth=true&business_id=${businessId}`,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/business/storefront?stripe_return=true&business_id=${businessId}`,
            type: 'account_onboarding',
        });
        
        return { url: accountLink.url };

    } catch (error: any) {
        console.error("Stripe Connect link error for business:", error);
        return { error: error.message };
    }
}

export async function createStripeDashboardLinkForBusiness(businessId: string): Promise<ActionResponse> {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: 'Stripe is not configured on the server. Please contact support.' };
    }
    if (!businessId) {
        return { error: 'Business ID is required.' };
    }

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const { firestore } = initializeAdminApp();
        const businessRef = firestore.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();
        const stripeAccountId = businessDoc.data()?.stripeAccountId;

        if (!stripeAccountId) {
            return { error: 'Stripe account is not connected for this business.' };
        }
        
        const account = await stripe.accounts.retrieve(stripeAccountId);
        
        if (!account.details_submitted) {
            const accountLink = await stripe.accountLinks.create({
                account: stripeAccountId,
                refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/business/storefront?reauth=true&business_id=${businessId}`,
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/business/storefront?stripe_return=true&business_id=${businessId}`,
                type: 'account_onboarding',
            });
            return { url: accountLink.url };
        }

        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
        
        return { url: loginLink.url };

    } catch (error: any) {
        console.error("Stripe dashboard link error for business:", error);
        return { error: error.message };
    }
}

export async function createStripeConnectAccountLinkForCommunity(communityId: string): Promise<ActionResponse> {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: 'Stripe is not configured on the server. Please contact support.' };
    }

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(communityId);
        const communityDoc = await communityRef.get();
        let stripeAccountId = communityDoc.data()?.stripeAccountId;

        if (!stripeAccountId) {
            const account = await stripe.accounts.create({ 
                type: 'express',
            });
            stripeAccountId = account.id;
            await communityRef.update({ stripeAccountId: stripeAccountId });
        }

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leader/financials?reauth=true`,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leader/financials?stripe_return=true`,
            type: 'account_onboarding',
        });
        
        return { url: accountLink.url };

    } catch (error: any) {
        console.error("Stripe Connect link error:", error);
        return { error: error.message };
    }
}

export async function createStripeDashboardLinkForCommunity(communityId: string): Promise<ActionResponse> {
    if (!process.env.STRIPE_SECRET_KEY) {
        return { error: 'Stripe is not configured on the server. Please contact support.' };
    }
    if (!communityId) {
        return { error: 'Community ID is required.' };
    }

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const { firestore } = initializeAdminApp();
        const communityRef = firestore.collection('communities').doc(communityId);
        const communityDoc = await communityRef.get();
        const stripeAccountId = communityDoc.data()?.stripeAccountId;

        if (!stripeAccountId) {
            return { error: 'Stripe account is not connected for this community.' };
        }
        
        const account = await stripe.accounts.retrieve(stripeAccountId);

        if (!account.details_submitted) {
            const accountLink = await stripe.accountLinks.create({
                account: stripeAccountId,
                refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leader/financials?reauth=true`,
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/leader/financials?stripe_return=true`,
                type: 'account_onboarding',
            });
            return { url: accountLink.url };
        }
        
        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
        
        return { url: loginLink.url };

    } catch (error: any) {
        console.error("Stripe dashboard link error for community:", error);
        return { error: error.message };
    }
}

