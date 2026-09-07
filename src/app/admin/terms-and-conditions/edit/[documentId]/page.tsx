
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateLegalDocumentAction } from '@/lib/actions/legalActions';
import { Textarea } from '@/components/ui/textarea';

type LegalDocumentData = {
    title: string;
    description: string;
    content: string;
    version: string;
};

export default function EditLegalDocumentPage() {
    const router = useRouter();
    const params = useParams();
    const documentId = params.documentId as string;

    const { toast } = useToast();
    const db = useFirestore();
    const [isSaving, setIsSaving] = React.useState(false);
    
    const docRef = useMemoFirebase(() => db ? doc(db, 'legal_documents', documentId) : null, [db, documentId]);
    const { data: documentData, isLoading } = useDoc<LegalDocumentData>(docRef);
    
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [content, setContent] = React.useState('');
    const [version, setVersion] = React.useState('');

    React.useEffect(() => {
        if (documentData) {
            setTitle(documentData.title);
            setDescription(documentData.description);
            setContent(documentData.content);
            setVersion(documentData.version);
        }
    }, [documentData]);

    const handleSave = async () => {
        if (!title || !description || !content) {
            toast({ title: 'Missing fields', description: 'Please fill out all fields.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        const result = await updateLegalDocumentAction(documentId, { title, description, content, version });
        if (result.success) {
            toast({ title: 'Document Updated', description: 'Your changes have been saved.' });
            router.push('/admin/terms-and-conditions');
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!documentData) {
        return <div className="text-center">Document not found.</div>;
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/admin/terms-and-conditions">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Legal Documents
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Edit Document
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="version">Version</Label>
                            <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <RichTextEditor value={content} onChange={setContent} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
