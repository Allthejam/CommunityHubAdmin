'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, ShieldAlert, XCircle, Pencil } from 'lucide-react';
import { differenceInDays, isValid } from 'date-fns';

type BusinessStatus = "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden" | "Trial Expired";

interface BusinessStatusBadgeProps {
  status: BusinessStatus;
  createdAt?: { toDate: () => Date } | string | number | Date | any;
}

/**
 * A reusable badge for displaying business and group statuses.
 * Includes logic for calculating the 14-day trial period for approved listings.
 */
export const BusinessStatusBadge = ({ status, createdAt }: BusinessStatusBadgeProps) => {
    const statusConfig = {
        'Draft': { icon: <Pencil className="h-4 w-4" />, text: "Draft", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
        'Pending Approval': { icon: <Clock className="h-4 w-4" />, text: "Pending Approval", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" },
        'Approved': { icon: <CheckCircle className="h-4 w-4" />, text: "Approved", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
        'Subscribed': { icon: <CheckCircle className="h-4 w-4" />, text: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
        'Requires Amendment': { icon: <ShieldAlert className="h-4 w-4" />, text: "Amendment Required", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" },
        'Declined': { icon: <XCircle className="h-4 w-4" />, text: "Declined", className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
        'Hidden': { icon: <XCircle className="h-4 w-4" />, text: "Hidden", className: "bg-gray-500 text-white" },
        'Trial Expired': { icon: <Clock className="h-4 w-4" />, text: "Trial Expired", className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
    };

    const config = statusConfig[status] || statusConfig['Draft'];
    let displayText = config.text;

    // Handle trial period logic for businesses that are 'Approved' but not yet 'Subscribed'
    if (status === 'Approved' && createdAt) {
        try {
            const date = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
            if (isValid(date)) {
                const now = new Date();
                const daysSinceCreation = differenceInDays(now, date);
                const trialDaysRemaining = 14 - daysSinceCreation;

                if (trialDaysRemaining > 0) {
                    displayText = `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left`;
                } else {
                    displayText = "Trial Expired";
                }
            }
        } catch (e) {
            console.error("Error calculating trial days:", e);
        }
    }

    return (
        <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap", config.className)}>
            {config.icon}
            {displayText}
        </Badge>
    );
};
