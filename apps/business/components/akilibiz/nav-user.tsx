"use client";

import { EllipsisVertical, UserCircle } from "lucide-react";
import { SignOutButton } from "@/app/(app)/dashboard/sign-out-button";
import { type AccountDisplay } from "@/components/akilibiz/account-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar-context";

export function NavUser({ account }: { account: AccountDisplay }) {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-13 rounded-xs data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
              size="lg"
              tooltip="Account"
            >
              <Avatar className="h-9 w-9 shrink-0 rounded-xs">
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                  {account.initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 gap-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">
                  {account.displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Staff
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                    {account.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {account.displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {account.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <UserCircle aria-hidden="true" className="size-4" />
                Account settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <SignOutButton
              className="text-red-600 focus:text-red-600"
              menuItem
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
