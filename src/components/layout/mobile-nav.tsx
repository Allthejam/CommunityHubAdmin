
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type MenuItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  subItems?: { href: string; label: string }[];
};

type MobileNavProps = {
  menuItems: MenuItem[];
};

export function MobileNav({ menuItems }: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
        </Button>
    );
  }
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
            <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
            >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
            </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
            <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Logo className="h-6 w-6" />
                    <span>Menu</span>
                </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
                <nav className="grid gap-1 p-4 text-base font-medium">
                    {menuItems.map(item => (
                        item.subItems ? (
                            <Accordion key={item.label} type="single" collapsible className="w-full">
                                <AccordionItem value={item.label} className="border-b-0">
                                    <AccordionTrigger className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                        <item.icon className="h-5 w-5" />
                                        <span className="flex-1 text-left">{item.label}</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-12 space-y-1">
                                        {item.subItems.map(subItem => (
                                            <SheetClose asChild key={subItem.href}>
                                                <Link href={subItem.href} className={cn("block rounded-lg py-2 text-muted-foreground hover:text-foreground", pathname === subItem.href && 'text-primary bg-muted')}>
                                                    {subItem.label}
                                                </Link>
                                            </SheetClose>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        ) : (
                            <SheetClose asChild key={item.label}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                    'flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground',
                                    pathname === item.href && 'text-primary bg-muted'
                                    )}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            </SheetClose>
                        )
                    ))}
                </nav>
            </ScrollArea>
        </SheetContent>
    </Sheet>
  );
}
