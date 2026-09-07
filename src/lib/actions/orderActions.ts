'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type OrderItem = {
    productId: string;
    quantity: number;
    price: number;
}

type OrderParams = {
    userId: string;
    businessId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: string;
}

export async function createOrderAction(params: OrderParams): Promise<ActionResponse> {
    const { userId, businessId, items, totalAmount, shippingAddress } = params;
    
    if (!userId || !businessId || !items || items.length === 0) {
        return { success: false, error: 'Missing required order information.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        
        const businessDoc = await firestore.collection('businesses').doc(businessId).get();
        if (!businessDoc.exists) {
            return { success: false, error: "Business not found." };
        }
        const businessData = businessDoc.data()!;
        const ownerId = businessData.ownerId;

        if (!ownerId) {
             return { success: false, error: "Business owner could not be determined." };
        }

        // 1. Create the main order document
        const orderRef = firestore.collection('orders').doc();
        const orderPayload = {
            userId,
            businessId,
            businessOwnerId: ownerId,
            items,
            totalAmount,
            shippingAddress,
            status: 'Received',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            customerName: shippingAddress.split(',')[0] || 'Customer', // Extract name for convenience
        };
        batch.set(orderRef, orderPayload);
        
        // 2. Create a notification for the business owner
        const notificationRef = firestore.collection('notifications').doc();
        batch.set(notificationRef, {
            recipientId: ownerId,
            type: 'New Order',
            subject: `You have a new order! (ID: ${orderRef.id.substring(0, 6)})`,
            from: 'Community Marketplace',
            date: Timestamp.now().toDate().toISOString(),
            status: 'New',
            relatedId: orderRef.id,
        });
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error creating order and notification:", error);
        return { success: false, error: 'Failed to process your order.' };
    }
}

export async function updateOrderStatusAction(params: {
    orderId: string,
    status: string,
}): Promise<ActionResponse> {
    const { orderId, status } = params;
    if (!orderId || !status) {
        return { success: false, error: 'Order ID and new status are required.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found.' };
        }

        const orderData = orderDoc.data()!;
        const batch = firestore.batch();

        const updatePayload = {
            status: status,
            updatedAt: Timestamp.now(),
        };

        // Update the main order document
        batch.update(orderRef, updatePayload);

        // Send notification to customer on key status changes
        if (['Packed', 'Shipped', 'Ready for Collection', 'Delivered/Collected'].includes(status)) {
            const notificationRef = firestore.collection('notifications').doc();
            batch.set(notificationRef, {
                recipientId: orderData.userId,
                type: 'Order Update',
                subject: `Your order #${orderId.substring(0,6)} is now ${status.toLowerCase()}!`,
                from: orderData.businessName || 'Your Local Store',
                date: Timestamp.now().toDate().toISOString(),
                status: 'New',
                relatedId: orderId,
            });
        }
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error updating order status:", error);
        return { success: false, error: error.message || 'Failed to update order status.' };
    }
}
