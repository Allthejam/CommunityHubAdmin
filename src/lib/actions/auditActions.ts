'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

export type AuditCategory = 
  | 'Users & Directory'
  | 'Communities & Hubs'
  | 'Applications & Vetting'
  | 'Reports & Moderation'
  | 'Broadcasts & Dispatches'
  | 'Team & Whitelist'
  | 'Financials & Commerce'
  | 'System & Settings';

export type AuditLogEntry = {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail?: string;
  action: string;
  category: AuditCategory;
  details: string;
  timestamp: any;
  targetUser?: {
    id: string;
    name: string;
    email?: string;
  };
  targetObject?: {
    id: string;
    name: string;
    type: string;
  };
  metadata?: Record<string, any>;
};

export type LogAuditParams = {
  adminId?: string;
  adminName?: string;
  adminEmail?: string;
  action: string;
  category: AuditCategory;
  details: string;
  targetUser?: {
    id: string;
    name: string;
    email?: string;
  };
  targetObject?: {
    id: string;
    name: string;
    type: string;
  };
  metadata?: Record<string, any>;
};

/**
 * Centrally and resiliently records an administrative audit event to Firestore.
 * Ensures logging operations never throw or disrupt the calling server action.
 */
export async function logAuditTrailAction(params: LogAuditParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = initializeAdminApp();
    
    const adminId = params.adminId || 'system_admin';
    const adminName = params.adminName || 'Platform Administration';
    
    const logDoc = {
      adminId,
      adminName,
      adminNameSnapshot: adminName,
      adminEmail: params.adminEmail || '',
      action: params.action,
      category: params.category,
      details: params.details,
      timestamp: Timestamp.now(),
      targetUser: params.targetUser || null,
      targetObject: params.targetObject || null,
      metadata: params.metadata || {},
    };

    await firestore.collection('audit_log').add(logDoc);
    return { success: true };
  } catch (error: any) {
    console.error("Audit Trail Logging Failure:", error);
    return { success: false, error: error.message };
  }
}
