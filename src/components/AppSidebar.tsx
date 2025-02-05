
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/store/authStore"
import { 
  ChefHat, 
  ClipboardList, 
  LogOut, 
  Menu, 
  ShoppingCart, 
  Timer, 
  User 
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

const menuItems = [
  {
    title: "Menus",
    path: "/",
    icon: Menu,
  },
  {
    title: "Recipes",
    path: "/recipes",
    icon: ChefHat,
  },
  {
    title: "Planning",
    path: "/planning",
    icon: Timer,
  },
  {
    title: "Shopping",
    path: "/shopping",
    icon: ShoppingCart,
  },
  {
    title: "Service",
    path: "/service",
    icon: ClipboardList,
  },
]

export function AppSidebar() {
  const location = useLocation()
  const { profile, signOut } = useAuthStore()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <User className="h-6 w-6" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {profile?.full_name || "User"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                  >
                    <Link to={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
