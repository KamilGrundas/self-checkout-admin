import { BrainCircuit, Home, MonitorCog, Package, Tags, Users } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { useI18n } from "@/i18n"
import { type Item, Main } from "./Main"
import { User } from "./User"

export function AppSidebar() {
  const { user: currentUser } = useAuth()
  const { t } = useI18n()

  const baseItems: Item[] = [
    { icon: Home, title: t("dashboard"), path: "/" },
    { icon: Package, title: t("products"), path: "/products" },
    { icon: Tags, title: t("categories"), path: "/categories" },
  ]

  const items = currentUser?.is_superuser
    ? [
        ...baseItems,
        {
          icon: MonitorCog,
          title: t("checkoutCounters"),
          path: "/checkout-counters",
        },
        { icon: Users, title: t("admin"), path: "/admin" },
        { icon: BrainCircuit, title: t("ml"), path: "/ml" },
      ]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
