
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Mail, FileText } from "lucide-react";

const guidelinesContent = [
    {
        title: "1. Scope of these Guidelines",
        points: [
            "These guidelines are intended for use by law enforcement agencies seeking information about user accounts or content on the Community Hub platform.",
            "All requests for user data must be made through the official channel outlined below. We do not respond to law enforcement requests through informal channels.",
        ]
    },
    {
        title: "2. Requirements for Legal Requests",
        points: [
            "All requests must be made in writing, on official law enforcement letterhead, and be signed by a sworn law enforcement official.",
            "Requests must be narrowly tailored to a legitimate law enforcement investigation and must specify the exact data being requested.",
            "Please include the following information in your request: The legal basis for the request (e.g., citation to a specific statute), the name and badge/ID number of the requesting agent, the official email address and direct contact phone number of the agent, and the specific user identifier(s) (e.g., User ID, email address) for which data is being requested.",
        ]
    },
    {
        title: "3. Submission of Requests",
        points: [
            "All legal process and law enforcement inquiries should be directed to our dedicated legal intake email: legal@communityhub.example.com (Note: This is a placeholder address).",
            "This email is for law enforcement use only. We will not respond to inquiries from the general public sent to this address.",
        ]
    },
    {
        title: "4. User Notification Policy",
        points: [
            "Our policy is to notify users of requests for their information prior to disclosure, unless we are legally prohibited from doing so (e.g., by a court order under 18 U.S.C. § 2705(b)).",
            "If your request falls under a non-disclosure order, please provide the specific legal basis for this requirement in your submission."
        ]
    },
     {
        title: "5. Emergency Disclosure Requests",
        points: [
            "We may voluntarily disclose user information to a law enforcement entity if we have a good-faith belief that an emergency involving danger of death or serious physical injury to any person requires such disclosure without delay. These requests must be submitted by a sworn law enforcement official and come from an official law enforcement email domain.",
        ]
    },
];

export default function LawEnforcementPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                <h1 className="mt-4 text-4xl font-bold tracking-tight font-headline">
                    Law Enforcement Guidelines
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Information for law enforcement agencies seeking to request user data.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Official Requests for User Data</CardTitle>
                    <CardDescription>This information is for law enforcement agencies only. Community Hub is committed to cooperating with law enforcement while respecting the privacy of our users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                   {guidelinesContent.map((section) => (
                       <div key={section.title}>
                           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                               <FileText className="h-5 w-5"/>
                               {section.title}
                           </h2>
                           <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                               {section.points.map((point, index) => (
                                   <li key={index}>{point}</li>
                               ))}
                           </ul>
                       </div>
                   ))}
                    <div className="pt-4 border-t">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Mail className="h-5 w-5"/>Contact Channel</h3>
                        <p className="text-muted-foreground mt-2">
                           Please direct all official correspondence to: <strong className="text-foreground">legal@communityhub.example.com</strong>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
