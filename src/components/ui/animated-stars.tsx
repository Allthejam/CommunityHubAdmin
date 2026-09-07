
'use client';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnimatedStars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
                <Star
                    key={index}
                    className={cn(
                        'h-4 w-4 transition-colors',
                        index < rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-muted-foreground/50'
                    )}
                />
            ))}
        </div>
    );
}
