
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
import { useMenuStore } from "@/store/menuStore"
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
  const { menuPlanningComplete } = useMenuStore()

  return (
    <Sidebar className="border-r border-gray-200 bg-gradient-to-b from-white to-gray-50">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg ring-2 ring-purple-500/20">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-gray-900 tracking-tight">
              {profile?.full_name || "User"}
            </span>
            <span className="text-sm text-purple-600 font-medium">Chef</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-purple-950/70 px-6 py-3 uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isMenusItem = item.path === "/";
                const isActive = location.pathname === item.path;
                const isDisabled = !isMenusItem && !menuPlanningComplete;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild={!isDisabled}
                      isActive={isActive}
                      className={`group flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-purple-100 text-purple-900"
                          : isDisabled
                          ? "opacity-50 cursor-not-allowed pointer-events-none"
                          : "hover:bg-gray-100"
                      }`}
                      aria-disabled={isDisabled}
                    >
                      {isDisabled ? (
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-gray-100">
                            <item.icon className="h-4 w-4 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-400">
                            {item.title}
                          </span>
                        </div>
                      ) : (
                        <Link to={item.path} className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md transition-colors duration-200 ${
                            isActive
                              ? "bg-purple-200"
                              : "bg-white shadow-sm group-hover:bg-purple-50"
                          }`}>
                            <item.icon className={`h-4 w-4 transition-colors duration-200 ${
                              isActive
                                ? "text-purple-600"
                                : "text-gray-600 group-hover:text-purple-600"
                            }`} />
                          </div>
                          <span className={`text-sm font-medium transition-colors duration-200 ${
                            isActive
                              ? "text-purple-900"
                              : "text-gray-700 group-hover:text-purple-900"
                          }`}>
                            {item.title}
                          </span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => signOut()}
                  className="group flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-red-50"
                >
                  <div className="p-1.5 rounded-md bg-white shadow-sm group-hover:bg-red-100">
                    <LogOut className="h-4 w-4 text-gray-600 group-hover:text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">
                    Sign Out
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
