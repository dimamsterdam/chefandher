
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
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {profile?.full_name || "User"}
            </span>
            <span className="text-xs text-gray-500">Chef</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-gray-500 px-4 py-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
                  >
                    <Link to={item.path}>
                      <item.icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{item.title}</span>
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
                <SidebarMenuButton 
                  onClick={() => signOut()}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 transition-colors hover:bg-red-50 w-full"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
