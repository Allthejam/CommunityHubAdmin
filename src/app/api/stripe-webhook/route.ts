
import 'dotenv/config';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';
import { createOrderAction } from '@/lib/actions/orderActions';
import { submitAdvertForApprovalAction } from '@/lib/actions/advertActions';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!webhookSecret) {
    console.error('Stripe webhook secret is not set.');
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Stripe secret key is not set.');
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout Session Completed:', session.id);

      const { userId, businessId, subscriptionType, purchaseType, cartItems, shippingAddress, advertId } = session.metadata || {};

      if (purchaseType === 'cart_checkout') {
          if (!userId || !cartItems || !shippingAddress) {
              console.error('Webhook Error: Missing required metadata for cart checkout.');
              return NextResponse.json({ received: true, error: 'Missing metadata for cart checkout' });
          }

          try {
              const parsedCartItems = JSON.parse(cartItems);

              const ordersByBusiness = parsedCartItems.reduce((acc: any, item: any) => {
                  const businessId = item.businessId;
                  if (!acc[businessId]) {
                      acc[businessId] = {
                          businessId: businessId,
                          items: [],
                          totalAmount: 0,
                      };
                  }
                  acc[businessId].items.push({
                      productId: item.id,
                      quantity: item.quantity,
                      price: item.price,
                  });
                  acc[businessId].totalAmount += item.price * item.quantity;
                  return acc;
              }, {});

              for (const businessId in ordersByBusiness) {
                  const order = ordersByBusiness[businessId];
                  await createOrderAction({
                      userId: userId,
                      businessId: order.businessId,
                      items: order.items,
                      totalAmount: order.totalAmount,
                      shippingAddress: shippingAddress,
                  });
              }

              console.log(`Successfully created orders for checkout session: ${session.id}`);
              
          } catch (e) {
              console.error('Webhook Error: Could not process cart checkout.', e);
              return NextResponse.json({ received: true, error: 'Error processing cart checkout' });
          }
      } else if (purchaseType === 'national_advert_campaign') {
            if (!userId || !advertId) {
                console.error('Webhook Error: Missing user ID or advert ID for national advert purchase.');
                return NextResponse.json({ received: true, error: 'Missing metadata for advert purchase' });
            }
            try {
                const { firestore } = initializeAdminApp();
                const advertRef = firestore.collection('adverts').doc(advertId);
                
                const advertDoc = await advertRef.get();
                if (!advertDoc.exists) {
                    console.error(`Webhook Error: Advert with ID ${advertId} not found.`);
                    return NextResponse.json({ received: true, error: 'Advert not found.' });
                }
                
                const advertData = advertDoc.data();
                if (advertData?.status !== 'Draft') {
                     console.warn(`Webhook for advert ${advertId} received, but advert status is '${advertData?.status}', not 'Draft'. Possibly already processed.`);
                     return NextResponse.json({ received: true, message: 'Advert already processed.' });
                }

                // Determine new status based on start date
                const startDate = advertData?.startDate?.toDate() || new Date();
                const newStatus = startDate <= new Date() ? 'Active' : 'Scheduled';

                await advertRef.update({
                    status: newStatus,
                    updatedAt: Timestamp.now(),
                });
                
                console.log(`Successfully processed national advert campaign ${advertId} for session: ${session.id}`);

            } catch (e) {
                console.error('Webhook Error: Could not process national advert campaign.', e);
                return NextResponse.json({ received: true, error: 'Error processing advert campaign' });
            }
      } else {
          // Handle subscription logic
          if (!businessId && !userId) {
            console.error('Webhook Error: Missing businessId or userId in session metadata.');
            return NextResponse.json({ received: true, error: 'Missing required metadata' });
          }
          
          try {
            const { firestore } = initializeAdminApp();
            
            let docRef;
            let updateData: { status?: 'Subscribed'; storefrontSubscription?: boolean; accountType?: string; updatedAt: Timestamp };

            if (subscriptionType === 'national_advertiser') {
                docRef = firestore.collection('users').doc(userId!);
                updateData = {
                    accountType: subscriptionType,
                    updatedAt: Timestamp.now(),
                }
            } else if (businessId) {
                docRef = firestore.collection('businesses').doc(businessId);
                updateData = {
                  status: 'Subscribed',
                  updatedAt: Timestamp.now(),
                };
                if (subscriptionType === 'storefront') {
                    updateData.storefrontSubscription = true;
                }
            } else {
                console.error('Webhook Error: Unhandled subscription scenario.');
                return NextResponse.json({ received: true, error: 'Unhandled subscription' });
            }

            await docRef.update(updateData);
            
            console.log(`Successfully updated document ${docRef.path}.`);

          } catch (dbError: any) {
            console.error(`Database update error:`, dbError);
            return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
          }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
