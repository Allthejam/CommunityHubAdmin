'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
    success: boolean;
    error?: string;
}

type JobVacancyParams = {
    title: string;
    company: string;
    businessId: string | null;
    jobType: string;
    shortDescription: string;
    fullDescription: string;
    website: string;
    contactMethod: string;
    contactValue: string;
    communityId: string;
    ownerId: string;
};

export async function postJobVacancyAction(params: JobVacancyParams): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const docRef = await firestore.collection('jobs').add({
            ...params,
            createdAt: Timestamp.now(),
        });

        // Moderation Scan
        await scanAndFlagAction({
            text: `${params.title} ${params.company} ${params.shortDescription} ${params.fullDescription}`,
            contentType: "Job Vacancy",
            authorId: params.ownerId,
            authorName: params.company,
            contentId: docRef.id
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error posting job vacancy:", error);
        return { success: false, error: error.message };
    }
}

type JobSeekerParams = {
    name: string;
    summary: string;
    profile: string;
    availableFrom?: Date;
    linkedin: string;
    portfolio: string;
    email: string;
    phone: string;
    communityId: string;
    ownerId: string;
};

export async function postJobSeekerProfileAction(params: JobSeekerParams): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const payload: any = { ...params };
        if (params.availableFrom) {
            payload.availableFrom = Timestamp.fromDate(new Date(params.availableFrom));
        }
        const docRef = await firestore.collection('jobSeekers').add({
            ...payload,
            createdAt: Timestamp.now(),
        });

        // Moderation Scan
        await scanAndFlagAction({
            text: `${params.name} ${params.summary} ${params.profile}`,
            contentType: "Job Seeker Profile",
            authorId: params.ownerId,
            authorName: params.name,
            contentId: docRef.id
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error posting job seeker profile:", error);
        return { success: false, error: error.message };
    }
}
