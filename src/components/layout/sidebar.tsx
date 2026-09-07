'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  FilePenLine,
  HeartHandshake,
  LayoutDashboard,
  Settings,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Logo } from '@/components/icons'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    href: '/',
    label: 'Community Feed',
    icon: LayoutDashboard,
  },
  {
    href: '/directory',
    label: 'Business Directory',
    icon: Building2,
  },
  {
    href: '/lost-and-found',
    label: 'Lost & Found',
    icon: HeartHandshake,
  },
  {
    href: '/reports',
    label: 'Volunteer Reports',
    icon: FilePenLine,
  },
]

export default function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Logo className="w-8 h-8" />
          <span className="text-primary group-data-[collapsible=icon]:hidden">
            LocalPulse
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  as="a"
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className={cn(
                    'justify-start',
                    pathname === item.href &&
                      'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <div className="mt-auto p-2">
         <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/settings" legacyBehavior passHref>
                    <SidebarMenuButton as="a" isActive={pathname === '/settings'} tooltip="Settings" className="justify-start">
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  )
}