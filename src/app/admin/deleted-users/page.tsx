"use client";

import * as React from "react";
import { UserX, Loader2, ArrowUpDown, Search, FilterX, MoreHorizontal, Eye, Copy, Archive, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function DeletedUsersPage() {
    const db = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = React.useState("");
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    const deletedUsersQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, "deleted_users"), orderBy("deletedAt", "desc"));
    }, [db]);

    const { data: deletedUsers, isLoading } = useCollection(deletedUsersQuery);

    const filteredUsers = React.useMemo(() => {
        if (!deletedUsers) return [];
        return deletedUsers.filter(u => 
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [deletedUsers, searchTerm]);

    const paginatedUsers = React.useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredUsers.slice(start, start + pagination.pageSize);
    }, [filteredUsers, pagination]);

    const pageCount = Math.ceil(filteredUsers.length / pagination.pageSize);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: `${label} copied to clipboard.` });
    };

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-500/10 via-slate-500/5 to-rose-500/10 border border-slate-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <Archive className="h-3.5 w-3.5" />
                        Audit Archive & Deletion Log
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline flex items-center gap-2 text-foreground">
                        <UserX className="h-7 w-7 text-destructive" />
                        Deleted User Accounts
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Permanent audit trail and historical record of accounts removed from the platform.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-500/10 border border-slate-500/20 rounded-xl px-4 py-2 self-start sm:self-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Archived:</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-200">{deletedUsers?.length || 0}</span>
                </div>
            </div>

            <Card className="border-t-4 border-t-slate-500 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-slate-500/5 via-transparent to-transparent rounded-t-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Deletion Log</CardTitle>
                            <CardDescription>View details of former platform members for auditing purposes.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or email..." 
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="rounded-md border overflow-hidden">
                        <Table className="responsive-table">
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="font-bold">User</TableHead>
                                    <TableHead className="font-bold">Email</TableHead>
                                    <TableHead className="font-bold">Deleted At</TableHead>
                                    <TableHead className="font-bold">Original Role</TableHead>
                                    <TableHead className="text-right font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedUsers.length > 0 ? (
                                    paginatedUsers.map((user) => (
                                        <ContextMenu key={user.id}>
                                            <ContextMenuTrigger asChild>
                                                <TableRow className="hover:bg-muted/50 transition-colors cursor-context-menu">
                                                    <TableCell className="font-semibold text-foreground" data-label="User">{user.name}</TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground" data-label="Email">{user.email}</TableCell>
                                                    <TableCell className="text-xs" data-label="Deleted At">{user.deletedAt ? format(user.deletedAt.toDate(), "PPP p") : 'N/A'}</TableCell>
                                                    <TableCell data-label="Original Role">
                                                        <Badge variant="outline" className="capitalize text-[10px] font-semibold bg-slate-100 dark:bg-slate-800">
                                                            {user.role || 'personal'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => copyToClipboard(user.id, "User ID")}>
                                                                    <Copy className="mr-2 h-4 w-4" /> Copy ID
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => copyToClipboard(user.email, "Email")}>
                                                                    <Copy className="mr-2 h-4 w-4" /> Copy Email
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuLabel>{user.name}</ContextMenuLabel>
                                                <ContextMenuSeparator />
                                                <ContextMenuItem onSelect={() => copyToClipboard(user.id, "User ID")}>
                                                    <Copy className="mr-2 h-4 w-4" /> Copy Reference ID
                                                </ContextMenuItem>
                                                <ContextMenuItem onSelect={() => copyToClipboard(user.email, "Email")}>
                                                    <Copy className="mr-2 h-4 w-4" /> Copy Email Address
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No deleted account records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationControls 
                        pagination={pagination} 
                        setPagination={setPagination} 
                        pageCount={pageCount} 
                        totalRows={filteredUsers.length} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}
