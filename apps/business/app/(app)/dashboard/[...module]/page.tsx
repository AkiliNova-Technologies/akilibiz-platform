import { notFound } from "next/navigation";

import { DesktopModulePage } from "@/components/akilibiz/desktop-module-page";
import { findDesktopRoute } from "@/lib/desktop-navigation";

export default async function DesktopModuleRoute({
  params,
}: {
  params: Promise<{ module: string[] }>;
}) {
  const { module } = await params;
  const route = findDesktopRoute(`/dashboard/${module.join("/")}`);
  if (!route || route.item.href === "/dashboard/settings/business") notFound();
  return <DesktopModulePage group={route.group} item={route.item} />;
}
