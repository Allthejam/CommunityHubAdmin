'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type ProductData = {
  name: string;
  description: string;
  price: number;
  stock: number;
  status: 'online' | 'offline';
  outOfStockAction?: 'deny' | 'allow';
  images?: ImageObject[];
  videoUrl?: string;
  audience?: string[];
  category?: string;
  brand?: string;
  referenceNumber?: string;
  mpn?: string;
  upc?: string;
  ean?: string;
  isbn?: string;
  onSale?: boolean;
  discountType?: 'amount' | 'percentage';
  salePrice?: number;
  discountValue?: number;
  showOriginalPrice?: boolean;
  saleDateRange?: { from?: Date; to?: Date; };
  shippingEnabled?: boolean;
  freeShipping?: boolean;
  shippingPrice?: number;
  shippingProvider?: string;
  deliveryTime?: string;
  metaTitle?: string;
  metaDescription?: string;
  hasVariations?: boolean;
  variationsConfig?: any;
  variationsStock?: any;
  authorName?: string;
  ownerId?: string;
};

type ImageObject = {
    url: string;
    description?: string;
};

type StoreSettings = {
    deliveryAvailable: boolean;
    deliveryType?: 'free' | 'flat_rate';
    deliveryPrice?: number;
    catalogueMode: boolean;
    showPricesInCatalogue: boolean;
};

export async function saveProductAction(params: {
  businessId: string;
  productData: ProductData;
  productId?: string;
}): Promise<ActionResponse> {
  const { businessId, productData, productId } = params;

  if (!businessId) {
    return { success: false; error: 'Business ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const productCollection = firestore.collection(`businesses/${businessId}/products`);
    
    const { saleDateRange, variationsConfig, variationsStock, ...restOfData } = productData;
    const finalProductData: any = {
        ...restOfData,
        saleStartDate: saleDateRange?.from ? Timestamp.fromDate(new Date(saleDateRange.from)) : null,
        saleEndDate: saleDateRange?.to ? Timestamp.fromDate(new Date(saleDateRange.to)) : null,
    };

    let savedProductRef;

    if (productId) {
      savedProductRef = productCollection.doc(productId);
      const variationsRef = savedProductRef.collection('product_data').doc('variations');
      
      const batch = firestore.batch();
      batch.update(savedProductRef, { ...finalProductData, updatedAt: Timestamp.now() });
      if (finalProductData.hasVariations) {
          batch.set(variationsRef, { config: variationsConfig, stock: variationsStock }, { merge: true });
      }
      await batch.commit();
    } else {
      savedProductRef = productCollection.doc();
      const variationsRef = savedProductRef.collection('product_data').doc('variations');

      const batch = firestore.batch();
      batch.set(savedProductRef, {
        ...finalProductData,
        businessId, 
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      if (finalProductData.hasVariations) {
        batch.set(variationsRef, { config: variationsConfig, stock: variationsStock });
      }
      await batch.commit();
    }

    // Moderation Scan - passing absolute path
    await scanAndFlagAction({
        text: `${productData.name} ${productData.description}`,
        contentType: "Storefront Product",
        authorId: productData.ownerId || businessId,
        authorName: productData.authorName || 'Business Owner',
        contentId: savedProductRef.id,
        contentPath: savedProductRef.path
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error saving product:', error);
    return { success: false, error: 'Failed to save product.' };
  }
}

export async function deleteProductAction(params: {
    businessId: string;
    productId: string;
}): Promise<ActionResponse> {
    const { businessId, productId } = params;
    if (!businessId || !productId) {
        return { success: false, error: 'Business ID and Product ID are required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.doc(`businesses/${businessId}/products/${productId}`).delete();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting product:', error);
        return { success: false, error: 'Failed to delete product.' };
    }
}

export async function updateProductStockAction(params: {
    businessId: string;
    productId: string;
    newStock: number;
}): Promise<ActionResponse> {
    const { businessId, productId, newStock } = params;
     if (!businessId || !productId) {
        return { success: false, error: 'Business and Product ID are required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const productRef = firestore.doc(`businesses/${businessId}/products/${productId}`);
        await productRef.update({ stock: newStock });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating stock:', error);
        return { success: false, error: 'Failed to update product stock.' };
    }
}


export async function saveOpeningHoursAction(params: {
    businessId: string;
    openingHours: any;
}): Promise<ActionResponse> {
    const { businessId, openingHours } = params;
    if (!businessId) {
        return { success: false, error: 'Business ID is required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const businessRef = firestore.collection('businesses').doc(businessId);
        await businessRef.update({ openingHours });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving opening hours:", error);
        return { success: false, error: 'Failed to save opening hours.' };
    }
}

export async function saveStoreSettingsAction(params: {
    businessId: string;
    settings: StoreSettings;
}): Promise<ActionResponse> {
    const { businessId, settings } = params;
    if (!businessId) {
        return { success: false, error: 'Business ID is required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const businessRef = firestore.collection('businesses').doc(businessId);
        await businessRef.update({ storeSettings: settings });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving store settings:", error);
        return { success: false, error: 'Failed to save store settings.' };
    }
}