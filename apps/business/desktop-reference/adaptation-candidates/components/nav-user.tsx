import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react";

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
import { useReduxAuth } from "@/hooks/useReduxAuth";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate } from "react-router-dom";

export function NavUser() {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { user, signOut } = useReduxAuth();
  const { t } = useI18n();

  // Get user initials for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (
      names[0].charAt(0) + names[names.length - 1].charAt(0)
    ).toUpperCase();
  };

  // Format user name display
  const formatName = (name?: string): string => {
    if (!name) return t("common.user");
    return name;
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
  };

  // If no user is logged in, show minimal UI
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            disabled
            className="opacity-70 cursor-not-allowed"
          >
            <Avatar className="h-8 w-8 rounded-xs">
              <AvatarFallback className="rounded-lg">?</AvatarFallback>
            </Avatar>
            {/* Added hiding rule for logged out text state */}
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{t("common.notLoggedIn")}</span>
              <span className="text-muted-foreground truncate text-xs">
                {t("common.pleaseSignIn")}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 rounded-xs h-13"
            >
              <Avatar className="h-9 w-9 rounded-xs shrink-0">
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              
              {/* 1. Hide user text immediately when collapsing */}
              <div className="grid flex-1 text-left text-sm leading-tight gap-1 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">
                  {formatName(user.full_name)}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.role_name || t("common.staff")}
                </span>
              </div>
              
              {/* 2. Hide the trailing vertical dots icon immediately when collapsing */}
              <IconDotsVertical className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {formatName(user.full_name)}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/dashboard/account")}>
                <IconUserCircle className="mr-2 size-4" />
                {t("common.accountSettings")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <IconLogout className="mr-2 size-4" />
              {t("common.logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
