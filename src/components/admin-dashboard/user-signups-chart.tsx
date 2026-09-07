'use client';

import * as React from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { subDays, format, eachDayOfInterval, startOfDay } from 'date-fns';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Loader2 } from 'lucide-react';

const UserSignupsChart = () => {
    const db = useFirestore();
    const [chartData, setChartData] = React.useState<{ date: string, signups: number, deletions: number }[]>([]);

    const sevenDaysAgo = React.useMemo(() => subDays(new Date(), 7), []);

    const usersQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'users'),
            where('joined', '>=', Timestamp.fromDate(sevenDaysAgo))
        );
    }, [db, sevenDaysAgo]);

    const deletedUsersQuery = useMemoFirebase(() => {
        if (!db) return null;
        // Assuming deleted_users collection has a 'deletedAt' or 'timestamp' field
        // We'll check for both common patterns
        return query(
            collection(db, 'deleted_users'),
            where('deletedAt', '>=', Timestamp.fromDate(sevenDaysAgo))
        );
    }, [db, sevenDaysAgo]);

    const { data: recentUsers, isLoading: usersLoading } = useCollection<{ joined: Timestamp }>(usersQuery);
    const { data: recentDeleted, isLoading: deletedLoading } = useCollection<{ deletedAt: Timestamp }>(deletedUsersQuery);

    React.useEffect(() => {
        if (recentUsers && recentDeleted) {
            const countsByDay = new Map<string, { signups: number, deletions: number }>();
            const interval = eachDayOfInterval({ start: sevenDaysAgo, end: new Date() });

            interval.forEach(day => {
                countsByDay.set(format(day, 'MMM d'), { signups: 0, deletions: 0 });
            });

            recentUsers.forEach(user => {
                const day = format(user.joined.toDate(), 'MMM d');
                if (countsByDay.has(day)) {
                    const current = countsByDay.get(day)!;
                    countsByDay.set(day, { ...current, signups: current.signups + 1 });
                }
            });

            recentDeleted.forEach(user => {
                // Handle possible field name variations
                const date = (user as any).deletedAt || (user as any).timestamp;
                if (!date) return;
                
                const day = format(date.toDate(), 'MMM d');
                if (countsByDay.has(day)) {
                    const current = countsByDay.get(day)!;
                    countsByDay.set(day, { ...current, deletions: current.deletions + 1 });
                }
            });

            const formattedData = Array.from(countsByDay.entries()).map(([date, data]) => ({
                date,
                signups: data.signups,
                deletions: data.deletions,
            }));
            
            setChartData(formattedData);
        }
    }, [recentUsers, recentDeleted, sevenDaysAgo]);

    if (usersLoading || deletedLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                    }}
                />
                <Legend />
                <Line 
                    name="New Signups"
                    type="monotone" 
                    dataKey="signups" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }} 
                />
                <Line 
                    name="Account Deletions"
                    type="monotone" 
                    dataKey="deletions" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }} 
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default UserSignupsChart;
