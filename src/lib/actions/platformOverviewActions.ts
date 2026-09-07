
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

type ActionResponse = {
  success: boolean;
  error?: string;
  data?: OverviewContent;
};

type OverviewItem = {
    icon: string;
    title: string;
    description: string;
};

type OverviewContent = {
    features: OverviewItem[];
    accountTypes: OverviewItem[];
}

const initialContent: OverviewContent = {
    features: [
        {
            icon: "Users",
            title: "Community-Centric Social Feed",
            description: "A dedicated, local-first social feed for residents to connect, share updates, and discuss community matters, free from the noise of global platforms."
        },
        {
            icon: "ShoppingCart",
            title: "Virtual High Street",
            description: "An e-commerce ecosystem for local businesses to create storefronts, sell products directly to residents, and keep revenue within the community."
        },
        {
            icon: "Calendar",
            title: "Events & 'What's On' Guide",
            description: "A centralized calendar for all community happenings, from local markets to council meetings, plus a guide to permanent local attractions."
        },
        {
            icon: "Newspaper",
            title: "Hyperlocal News & Reporting",
            description: "A space for community leaders and designated reporters to publish local news, ensuring residents receive timely and relevant information."
        },
        {
            icon: "Megaphone",
            title: "Tiered Announcement System",
            description: "Leaders can send standard and urgent announcements to their community, keeping everyone informed about important, non-critical updates."
        },
        {
            icon: "Siren",
            title: "National Emergency Broadcast System",
            description: "A high-priority, non-dismissible alert system for verified government and emergency services to deliver critical information to targeted regions."
        },
        {
            icon: "MessageSquare",
            title: "Private & Secure Chat",
            description: "Encrypted, real-time messaging for both one-on-one conversations and private group chats within the community leadership team."
        },
        {
            icon: "DollarSign",
            title: "Sustainable Revenue Share Model",
            description: "Community Leaders earn a 40% share of local business subscription revenue, creating a self-sustaining model that funds community projects or leader income."
        }
    ],
    accountTypes: [
        {
            icon: "Users",
            title: "Personal Account",
            description: "The backbone of the community. Users can connect with neighbours, shop locally on the Virtual Highstreet, participate in forums, and stay informed about local news and events."
        },
        {
            icon: "Briefcase",
            title: "Business Account",
            description: "For local entrepreneurs. This account allows businesses to create a profile, list in the directory, post adverts, create events, and open a fully functional e-commerce storefront."
        },
        {
            icon: "Crown",
            title: "Community Leader Account",
            description: "The hub manager. Leaders moderate content, approve business listings, manage community pages (About, FAQ), and can send announcements. They are empowered to build and grow their digital town square."
        },
        {
            icon: "HeartHandshake",
            title: "Enterprise Account",
            description: "For larger local organizations like housing associations or franchises. They can manage multiple business-like profiles under one umbrella, posting events and content relevant to their specific group within the community."
        },
        {
            icon: "Globe",
            title: "National Advertiser Account",
            description: "For brands with a nationwide reach. This account enables advertising across the entire platform, targeting users by interest and demographics rather than specific communities, offering broad visibility."
        }
    ]
};


export async function getPlatformOverviewContent(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_overview').doc('content');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return { success: true, data: docSnap.data() as OverviewContent };
    } else {
      // Seed the document if it doesn't exist
      await docRef.set(initialContent);
      return { success: true, data: initialContent };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePlatformOverviewContent(content: OverviewContent): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const docRef = firestore.collection('platform_overview').doc('content');
    await docRef.set(content, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating platform overview content:", error);
    return { success: false, error: error.message };
  }
}
