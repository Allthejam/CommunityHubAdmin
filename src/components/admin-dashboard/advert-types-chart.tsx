'use client';

import * as React from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const COLORS = ['#29ABE2', '#F59E0B', '#10B981', '#8B5CF6'];

const AdvertTypesChart = () => {
    const db = useFirestore();

    const advertsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'adverts'),
            where('scope', '==', 'national')
        );
    }, [db]);

    const { data: adverts, isLoading } = useCollection<{ type: 'featured' | 'partner' }>(advertsQuery);

    const chartData = React.useMemo(() => {
        if (!adverts) return [];

        const counts = adverts.reduce((acc, advert) => {
            const type = advert.type || 'partner'; // Default to partner
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.keys(counts).map((name) => ({
            name: name === 'featured' ? 'Featured Ads' : 'Partner Ads',
            value: counts[name],
        }));
    }, [adverts]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }
    
    if (chartData.length === 0) {
        return (
            <div className="flex justify-center items-center h-full text-muted-foreground">
                No advertiser data available.
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))"
                    }}
                 />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default AdvertTypesChart;
