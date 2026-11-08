"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type NavSubItem = { title: string; url: string };
export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: NavSubItem[];
};

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeParentTitle = useMemo(() => {
    const activeParent = items.find(
      (item) =>
        item.items?.length &&
        (pathname === item.url ||
          item.items.some((sub) => pathname === sub.url)),
    );
    return activeParent?.title ?? null;
  }, [items, pathname]);
  const [expandedState, setExpandedState] = useState({
    pathname,
    title: activeParentTitle,
  });
  const openItemTitle =
    expandedState.pathname === pathname
      ? expandedState.title
      : activeParentTitle;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => {
            const isParentActive =
              pathname === item.url ||
              item.items?.some((sub) => pathname === sub.url);
            return (
              <NavItemRow
                key={item.title}
                item={item}
                isParentActive={!!isParentActive}
                currentPath={pathname}
                isOpen={openItemTitle === item.title}
                onToggle={() =>
                  setExpandedState({
                    pathname,
                    title: openItemTitle === item.title ? null : item.title,
                  })
                }
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavItemRow({
  item,
  isParentActive,
  currentPath,
  isOpen,
  onToggle,
}: {
  item: NavItem;
  isParentActive: boolean;
  currentPath: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasChildren = !!item.items?.length;
  const subMenuId = `sidebar-submenu-${useId()}`;
  if (!hasChildren)
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip={item.title}
          isActive={isParentActive}
          className={cn(
            "rounded-none transition-colors",
            isParentActive
              ? "bg-[#3b82f6] text-primary border-l-2 border-primary rounded-none"
              : "hover:bg-secondary/50 hover:text-primary",
          )}
        >
          <Link href={item.url}>
            {item.icon && <item.icon className="size-5"/>}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isParentActive}
        onClick={onToggle}
        aria-controls={subMenuId}
        aria-expanded={isOpen}
        className={cn(
          "rounded-none transition-colors",
          isParentActive
            ? "bg-primary/10 text-primary border-l-2 border-primary rounded-none"
            : "hover:bg-secondary/50 hover:text-primary",
        )}
      >
        {item.icon && <item.icon className="size-5"/>}
        <span>{item.title}</span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </SidebarMenuButton>
      {isOpen && (
        <SidebarMenuSub id={subMenuId}>
          {item.items?.map((subItem) => {
            const isSubActive = currentPath === subItem.url;
            return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isSubActive}
                  className={cn(
                    "h-10 rounded-none",
                    isSubActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-secondary/40",
                  )}
                >
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
