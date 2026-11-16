import {desktopNavigation, type NavigationGroup} from "./desktop-navigation";
import type {BusinessMembership} from "./business-context";

/**
 * Sidebar visibility is presentation only. RLS, server pages and API routes
 * MUST independently authorize every operation. An unknown role gets no
 * privileged navigation.
 *
 * Owner-only mirrors and settings are intentionally not advertised to
 * non-owners until their corresponding hosted read policies are qualified.
 */
export function navigationForBusinessRole(
  role:BusinessMembership["role"]|null,
):NavigationGroup[]{
  if(role==="owner")return desktopNavigation;
  if(role===null)return [];
  const staffGroups=new Set(["dashboard"]);
  if(role==="cashier"||role==="manager")staffGroups.add("pos");
  return desktopNavigation.filter(group=>staffGroups.has(group.icon)).map(group=>{
    if(group.icon!=="pos")return group;
    // Cashier/manager POS access is limited to the staged-sale workflows
    // explicitly supported by their server-side role policy.
    return {...group,items:group.items.filter(item=>
      item.href==="/dashboard/pos/new-sale")};
  }).filter(group=>group.items.length>0);
}
