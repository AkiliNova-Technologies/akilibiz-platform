import { useId, useMemo, useState } from "react";
import { type Icon, IconChevronDown } from "@tabler/icons-react";
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
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type NavSubItem = {
  title: string;
  url: string;
  permission?: string;
};

type NavItem = {
  title: string;
  url: string;
  icon?: Icon;
  items?: NavSubItem[];
};

export function NavMain({
  items,
}: {
  items: NavItem[];
}) {
  const location = useLocation();

  const activeParentTitle = useMemo(() => {
    const activeParent = items.find(
      (item) =>
        item.items?.length &&
        (location.pathname === item.url ||
          item.items.some((sub) => location.pathname === sub.url)),
    );

    return activeParent?.title ?? null;
  }, [items, location.pathname]);

  const [expandedState, setExpandedState] = useState({
    pathname: location.pathname,
    title: activeParentTitle,
  });
  // A new route derives its relevant parent during render. Once the user
  // toggles a group on that route, the local choice remains authoritative.
  const openItemTitle =
    expandedState.pathname === location.pathname
      ? expandedState.title
      : activeParentTitle;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => {
            const isParentActive =
              location.pathname === item.url ||
              item.items?.some((sub) => location.pathname === sub.url);

            return (
              <NavItemRow
                key={item.title}
                item={item}
                isParentActive={!!isParentActive}
                currentPath={location.pathname}
                isOpen={openItemTitle === item.title}
                onToggle={() =>
                  setExpandedState({
                    pathname: location.pathname,
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

  if (!hasChildren) {
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
          <Link to={item.url}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

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
        {item.icon && <item.icon />}
        <span>{item.title}</span>
        <IconChevronDown
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
                  <Link to={subItem.url}>
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
