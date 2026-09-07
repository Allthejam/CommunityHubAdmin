'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const COLORS = ['#29ABE2', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

const AccountTypesChart = () => {
    const db = useFirestore();

    const usersQuery = useMemoFirebase(() => {
        if (!db) return null;
        return collection(db, 'users');
    }, [db]);

    const { data: users, isLoading } = useCollection<{ accountType: string }>(usersQuery);

    const chartData = React.useMemo(() => {
        if (!users) return [];

        const counts = users.reduce((acc, user) => {
            const type = user.accountType || 'personal'; // Default to personal if not specified
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.keys(counts).map((name) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: counts[name],
        }));
    }, [users]);

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
                No user data available.
            </div>
        );
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

export default AccountTypesChart;
