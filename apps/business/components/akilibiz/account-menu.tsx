"use client";

import { Ellipsis, UserRound } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/app/(app)/dashboard/sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar-context";

export type AccountDisplay = {
  displayName: string;
  email: string;
  initials: string;
};

type AccountMenuProps = {
  account: AccountDisplay;
  placement: "header" | "sidebar";
};

export function AccountMenu({ account, placement }: AccountMenuProps) {
  const { isMobile } = useSidebar();
  const renderAvatar = () => (
    <Avatar size={placement === "header" ? "lg" : "default"}>
      <AvatarFallback className="bg-primary/10 text-primary">
        {account.initials}
      </AvatarFallback>
    </Avatar>
  );

  const content = (
    <DropdownMenuContent
      align="end"
      className="min-w-56"
      side={placement === "sidebar" && !isMobile ? "right" : "bottom"}
      sideOffset={8}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-3 px-3 py-3">
          {renderAvatar()}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {account.displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {account.email}
            </p>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><Link href="/businesses">Switch business</Link></DropdownMenuItem>
      <SignOutButton menuItem />
    </DropdownMenuContent>
  );

  if (placement === "sidebar") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip="Account"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {renderAvatar()}
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">
                    {account.displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {account.email}
                  </span>
                </div>
                <Ellipsis className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            {content}
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open account menu" size="icon" variant="ghost">
          {renderAvatar()}
          <span className="sr-only">Open account menu</span>
        </Button>
      </DropdownMenuTrigger>
      {content}
    </DropdownMenu>
  );
}
