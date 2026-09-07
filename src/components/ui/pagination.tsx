
"use client";
import React from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
    pagination: { pageIndex: number; pageSize: number; };
    setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number; }>>;
    pageCount: number;
    totalRows: number;
}

export const PaginationControls = ({ pagination, setPagination, pageCount, totalRows }: PaginationControlsProps) => {
    
    const handlePageChange = (newPageIndex: number) => {
        setPagination(prev => ({...prev, pageIndex: newPageIndex}));
    };
    
    const handlePageSizeChange = (newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    };

    return (
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                {totalRows} total row(s).
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${pagination.pageSize}`}
                        onValueChange={(value) => handlePageSizeChange(Number(value))}
                        >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={`${pagination.pageSize}`} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-full sm:w-[100px] items-center justify-center text-sm font-medium">
                    Page {pagination.pageIndex + 1} of{" "}
                    {pageCount || 1}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => handlePageChange(0)} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => handlePageChange(pagination.pageIndex - 1)} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => handlePageChange(pagination.pageIndex + 1)} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => handlePageChange(pageCount - 1)} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
    )
};
