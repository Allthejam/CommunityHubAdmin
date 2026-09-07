"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck, Mail, Printer, Briefcase, PenTool, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { differenceInMonths, addMonths, addDays, isAfter, isBefore } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";

export default function Footer() {
    const { user } = useUser();
    const db = useFirestore();
    const [showEasterEgg, setShowEasterEgg] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const legacyRef = useMemoFirebase(() => db ? doc(db, 'owner_legacy', 'settings') : null, [db]);
    const { data: legacyData } = useDoc<any>(legacyRef);

    const ownerQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, 'users'), where('role', '==', 'owner'));
    }, [db]);
    const { data: owners } = useCollection(ownerQuery);

    React.useEffect(() => {
        if (user && userProfile && legacyData && owners && owners.length > 0) {
            // Robust staff check including common admin roles and titles
            const role = (userProfile.role || "").toLowerCase();
            const title = (userProfile.title || "").toLowerCase();
            const isStaff = role === 'owner' || 
                            role === 'admin' || 
                            role === 'administrator' ||
                            role === 'moderator' ||
                            title.includes('platform') ||
                            userProfile.permissions?.isStaff === true;

            // 1. Resolve Owner's Last Action
            const primaryOwner = owners[0];
            const lastActive = primaryOwner.lastActive?.toDate ? primaryOwner.lastActive.toDate() : (primaryOwner.lastActive ? new Date(primaryOwner.lastActive) : new Date(0));
            
            // 2. Calculate the 14-Day Display Window
            // Trigger starts exactly X months after lastActive
            const triggerDate = addMonths(lastActive, legacyData.inactivityMonths || 6);
            // Window closes 14 days after the trigger
            const expiryDate = addDays(triggerDate, 14);
            const now = new Date();

            // 3. Determine Visibility
            const isWithinDisplayWindow = isAfter(now, triggerDate) && isBefore(now, expiryDate);
            const isTesting = !!legacyData?.debugShowEasterEgg;

            if (isStaff && (isWithinDisplayWindow || isTesting)) {
                setShowEasterEgg(true);
            } else {
                setShowEasterEgg(false);
            }
        }
    }, [user, userProfile, legacyData, owners]);

    return (
        <footer className="bg-secondary text-secondary-foreground py-8 border-t">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <p>&copy; {new Date().getFullYear()} Community Hub Admin Hub</p>
                        <Separator orientation="vertical" className="h-4 hidden md:block" />
                        <Link href="/admin/terms-and-conditions" className="hover:underline">Legal Documentation</Link>
                        <Separator orientation="vertical" className="h-4 hidden md:block" />
                        <Link href="/admin/careers" className="hover:underline flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3" />
                            Careers
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* THE EASTER EGG TRIGGER */}
                        {showEasterEgg && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-2 text-primary font-bold animate-pulse hover:bg-primary/10 text-right">
                                        <PenTool className="h-4 w-4 shrink-0" />
                                        From the Great Beyond
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg bg-[#fdfcf0] border-[#d4d1b8] text-[#3d3b2f] p-0 overflow-hidden shadow-2xl rounded-none">
                                    <div className="p-1 bg-[#d4d1b8] h-1 w-full" />
                                    <DialogHeader className="px-10 pt-10 pb-4">
                                        <div className="flex justify-center mb-6">
                                            <div className="h-12 w-12 rounded-full border-2 border-[#d4d1b8] flex items-center justify-center opacity-40">
                                                <PenTool className="h-6 w-6" />
                                            </div>
                                        </div>
                                        <DialogTitle className="text-center font-serif text-3xl font-normal italic tracking-tight">
                                            A Final Note from the Founder
                                        </DialogTitle>
                                        <DialogDescription className="text-center uppercase text-[9px] tracking-[0.3em] font-bold opacity-50 mt-2">
                                            Platform Legacy Transmission &bull; Open Record
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="max-h-[60vh] px-12 pb-12">
                                        <div className="font-serif text-lg leading-relaxed space-y-6 italic opacity-90 first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:leading-none whitespace-pre-wrap">
                                            {legacyData?.foundersMessage || "Thank you for being part of this journey. The community is what we make of it. Good luck to the team."}
                                        </div>
                                        <div className="mt-12 pt-8 border-t border-[#d4d1b8]/50 flex justify-between items-center opacity-60">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Platform Founder</p>
                                                <p className="font-serif italic">The Original Architect</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Protocol Timestamp</p>
                                                <p className="font-mono text-[10px]">{new Date().toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                    <DialogFooter className="bg-[#f2efe1] p-6 border-t border-[#d4d1b8]">
                                        <DialogClose asChild>
                                            <Button variant="ghost" className="font-serif italic text-sm hover:bg-black/5 mx-auto">Close Letter</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        <Button variant="ghost" size="sm" onClick={() => window.print()} className="gap-2">
                            <Printer className="h-4 w-4" />
                            Print View
                        </Button>
                        <Link href="/admin/law-enforcement" className="hover:underline flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4" />
                            Law Enforcement
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}

function Separator({ className, orientation = "horizontal" }: { className?: string, orientation?: "horizontal" | "vertical" }) {
    return (
        <div className={cn(
            "bg-border shrink-0",
            orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
            className
        )} />
    )
}
