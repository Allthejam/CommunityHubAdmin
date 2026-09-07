'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { startOfDay } from "date-fns";

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
  count?: number;
};

export type CareerData = {
    title: string;
    department: string;
    reportsTo?: string;
    location: string;
    employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Job Share';
    salary: string;
    description: string;
    status: 'Draft' | 'Open' | 'Closed';
    closingDate: Date;
    isInternalOnly: boolean;
}

const EOE_STATEMENT = "My Community App is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.";
const EOE_HTML = `<p><strong>${EOE_STATEMENT}</strong></p>`;

export async function saveCareerAction(data: Partial<CareerData> & { id?: string }): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const careersCollection = firestore.collection('careers');
        const { id, ...dataToSave } = data;

        // Ensure the EOE statement is at the bottom
        let finalDescription = dataToSave.description || "";
        if (finalDescription && !finalDescription.includes(EOE_STATEMENT)) {
            finalDescription += `<br/><br/>${EOE_HTML}`;
        }

        const payload: any = {
            ...dataToSave,
            description: finalDescription,
            updatedAt: Timestamp.now(),
        };

        if (dataToSave.closingDate) {
            payload.closingDate = Timestamp.fromDate(new Date(dataToSave.closingDate));
        }

        if (id) {
            await careersCollection.doc(id).update(payload);
            return { success: true, id };
        } else {
            const newRef = await careersCollection.add({
                ...payload,
                createdAt: Timestamp.now(),
            });
            return { success: true, id: newRef.id };
        }
    } catch (error: any) {
        console.error("Error saving career:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteCareerAction(id: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('careers').doc(id).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting career:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Platform Maintenance: Bulk close expired vacancies.
 * Finds all 'Open' careers where the closingDate is in the past and sets status to 'Closed'.
 */
export async function runCareerCleanupAction(): Promise<ActionResponse> {
    const { firestore } = initializeAdminApp();
    const today = startOfDay(new Date());

    try {
        const snapshot = await firestore.collection('careers')
            .where('status', '==', 'Open')
            .get();

        const expiredDocs = snapshot.docs.filter(doc => {
            const data = doc.data();
            if (!data.closingDate) return false;
            const closingDate = data.closingDate.toDate ? data.closingDate.toDate() : new Date(data.closingDate);
            return closingDate && !isNaN(closingDate.getTime()) && closingDate < today;
        });

        if (expiredDocs.length === 0) {
            return { success: true, count: 0 };
        }

        const batchSize = 500;
        let totalUpdated = 0;
        let currentBatch = firestore.batch();

        for (const doc of expiredDocs) {
            currentBatch.update(doc.ref, {
                status: 'Closed',
                updatedAt: Timestamp.now(),
                autoClosed: true,
                closureReason: 'Auto-closed: Recruitment window expired.'
            });

            totalUpdated++;
            if (totalUpdated % batchSize === 0) {
                await currentBatch.commit();
                currentBatch = firestore.batch();
            }
        }

        if (totalUpdated % batchSize !== 0) {
            await currentBatch.commit();
        }

        console.log(`[Careers Maintenance] Successfully closed ${totalUpdated} expired vacancies.`);
        return { success: true, count: totalUpdated };

    } catch (error: any) {
        console.error("[Careers Maintenance] Cleanup failed:", error);
        return { success: false, error: error.message };
    }
}
