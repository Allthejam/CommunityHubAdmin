'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { filterInappropriateContent } from '@/ai/flows/filter-inappropriate-content';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const moderationSchema = z.object({
  text: z.string().min(1, 'Please enter some text to test.'),
});

export function ModerationForm() {
  const [result, setResult] = React.useState<{ isAppropriate: boolean; reason?: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof moderationSchema>>({
    resolver: zodResolver(moderationSchema),
    defaultValues: {
      text: '',
    },
  });

  async function onSubmit(data: z.infer<typeof moderationSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const output = await filterInappropriateContent({ text: data.text });
      setResult(output);
    } catch (error: any) {
      toast({
        title: 'Moderation Test Failed',
        description: error.message || 'The AI service encountered an error.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content to Test</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Paste a post or comment here to see how the AI classifies it..."
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Analyze Content
          </Button>
        </form>
      </Form>

      {result && (
        <Alert variant={result.isAppropriate ? 'default' : 'destructive'}>
          {result.isAppropriate ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          <AlertTitle>
            Result: {result.isAppropriate ? 'Appropriate' : 'Inappropriate'}
          </AlertTitle>
          <AlertDescription className="mt-2">
            {result.reason || 'No specific reason provided by the AI.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
