
"use client";

import * as React from "react";
import {
  FileText,
  MoreHorizontal,
  Eye,
  FileEdit,
  Archive,
  Trash2,
  CheckCircle,
  XCircle,
  PlusCircle,
  Loader2,
  ArrowUpDown,
  RotateCw,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { deleteLegalDocumentAction, updateLegalDocumentStatusAction } from "@/lib/actions/legalActions";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PaginationControls } from "@/components/ui/pagination";
// NEW IMPORTS
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type LegalDocumentStatus = "Published" | "Draft" | "Archived";

type LegalDocument = {
  id: string;
  title: string;
  description: string;
  status: LegalDocumentStatus;
  lastUpdated: { toDate: () => Date };
  version: string;
  content: string;
};

const StatusBadge = ({ status }: { status: LegalDocumentStatus }) => {
    const config = {
        Published: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        Draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
        Archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
    };
    return <Badge className={config[status] || ""}>{status}</Badge>
}

// NEW COMPONENT
const DocumentCard = ({ doc, onUpdateStatus, onDelete }: { doc: LegalDocument, onUpdateStatus: (id: string, status: LegalDocumentStatus) => void; onDelete: (id: string) => void; }) => {
    const { toast } = useToast();

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <CardTitle>{doc.title}</CardTitle>
                        <CardDescription>
                            Version {doc.version} &bull; Last updated {format(doc.lastUpdated.toDate(), 'PPP')}
                        </CardDescription>
                    </div>
                    <StatusBadge status={doc.status} />
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible>
                    <AccordionItem value="content" className="border-b-0">
                        <AccordionTrigger>View Content</AccordionTrigger>
                        <AccordionContent>
                             <div className="prose dark:prose-invert max-w-none mt-4 border-t pt-4" dangerouslySetInnerHTML={{ __html: doc.content }} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="mt-4 p-2 bg-muted/50 rounded-md">
                    <Label htmlFor={`ref-${doc.id}`} className="text-xs font-bold text-slate-400">REFERENCE ID</Label>
                    <Input
                        id={`ref-${doc.id}`}
                        readOnly
                        value={doc.id}
                        className="w-full h-8 text-xs font-mono bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        onClick={(e) => {
                            (e.target as HTMLInputElement).select();
                            navigator.clipboard.writeText(doc.id);
                            toast({ title: "Copied!", description: "Document ID copied to clipboard." });
                        }}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/terms-and-conditions/edit/${doc.id}`}><FileEdit className="mr-2 h-4 w-4"/> Edit</Link>
                </Button>
                 {doc.status === 'Draft' || doc.status === 'Archived' ? (
                    <Button size="sm" variant="secondary" onClick={() => onUpdateStatus(doc.id, 'Published')}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Publish
                    </Button>
                ) : null}
                 {doc.status === 'Published' && (
                    <Button size="sm" variant="secondary" onClick={() => onUpdateStatus(doc.id, 'Archived')}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </Button>
                )}
                {doc.status === 'Archived' && (
                    <Button size="sm" variant="secondary" onClick={() => onUpdateStatus(doc.id, 'Draft')}>
                        <RotateCw className="mr-2 h-4 w-4" /> Unarchive to Draft
                    </Button>
                )}
                 <Button size="sm" variant="destructive" onClick={() => onDelete(doc.id)}>
                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                </Button>
            </CardFooter>
        </Card>
    )
}


export default function TermsAndConditionsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const db = useFirestore();
    
    const documentsQuery = useMemoFirebase(() => db ? query(collection(db, 'legal_documents'), orderBy('lastUpdated', 'desc')) : null, [db]);
    const { data: documents, isLoading } = useCollection<LegalDocument>(documentsQuery);

    const handleUpdateStatus = async (id: string, status: LegalDocumentStatus) => {
        const result = await updateLegalDocumentStatusAction(id, status);
        if (result.success) {
            toast({ title: "Status Updated", description: `Document status changed to ${status}.`});
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive'});
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to permanently delete this document?')) return;
        const result = await deleteLegalDocumentAction(id);
         if (result.success) {
            toast({ title: "Document Deleted" });
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive'});
        }
    }
    
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Terms &amp; Conditions
        </h1>
        <p className="text-muted-foreground">
            View and edit all legal text and disclaimers for the platform.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Legal Documents</CardTitle>
                <CardDescription>A centralized list of all legal documents used across the platform.</CardDescription>
            </div>
            <Button asChild>
                <Link href="/admin/terms-and-conditions/create">
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Create New Document
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader><div className="h-6 w-3/4 bg-muted animate-pulse rounded-md" /></CardHeader>
                            <CardContent><div className="h-20 w-full bg-muted animate-pulse rounded-md" /></CardContent>
                        </Card>
                    ))
                ) : documents && documents.length > 0 ? (
                    documents.map((doc) => (
                       <DocumentCard key={doc.id} doc={doc} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No legal documents have been created.
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
