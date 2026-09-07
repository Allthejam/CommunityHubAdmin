
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { createLegalDocumentAction } from '@/lib/actions/legalActions';
import { generateLegalDocumentAction } from '@/ai/flows/generate-legal-document';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function AIGenerateButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Draft with AI
        </Button>
    )
}

const initialAiState = {
    title: '',
    content: '',
    error: undefined,
    success: false,
};

export default function CreateLegalDocumentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    // State for the AI form
    const [aiState, formAction] = useActionState(generateLegalDocumentAction, initialAiState);
    const aiFormRef = React.useRef<HTMLFormElement>(null);

    // State for the main form
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [content, setContent] = React.useState('');
    const [version, setVersion] = React.useState('1.0');

    // Effect to update form fields when AI generation is complete
    React.useEffect(() => {
        if (aiState.success) {
            setTitle(aiState.title || '');
            setContent(aiState.content || '');
            toast({
                title: "Draft Generated",
                description: "The AI has generated a draft. Please review and edit before saving.",
            });
        }
        if (aiState.error) {
            toast({
                title: "AI Generation Failed",
                description: aiState.error,
                variant: "destructive",
            });
        }
    }, [aiState, toast]);

    const handleSave = async () => {
        if (!title || !description || !content) {
            toast({ title: 'Missing fields', description: 'Please fill out all fields.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        const result = await createLegalDocumentAction({ title, description, content, version });
        if (result.success) {
            toast({ title: 'Document Created', description: 'Your new legal document has been saved as a draft.' });
            router.push('/admin/terms-and-conditions');
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

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
                    Create New Legal Document
                </h1>
            </div>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> AI-Powered Draft Generation</CardTitle>
                    <CardDescription>
                        Select a document type and let our AI create a baseline draft for you based on the app's features.
                    </CardDescription>
                </CardHeader>
                <form ref={aiFormRef} action={formAction}>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="documentType">Document Type</Label>
                                <Select name="documentType" defaultValue="Terms of Service">
                                    <SelectTrigger id="documentType">
                                        <SelectValue placeholder="Select a document type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Terms of Service">Terms of Service</SelectItem>
                                        <SelectItem value="Privacy Policy">Privacy Policy</SelectItem>
                                        <SelectItem value="Cookie Policy">Cookie Policy</SelectItem>
                                        <SelectItem value="Acceptable Use Policy">Acceptable Use Policy</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                       <AIGenerateButton />
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Document Editor</CardTitle>
                    <CardDescription>
                       Review and edit the document content below. The AI-generated draft will appear here once created.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="version">Version</Label>
                            <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Internal Description *</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short internal description of what this document is for." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content *</Label>
                        <RichTextEditor value={content} onChange={setContent} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save as Draft
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
