import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
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
  User,
  Loader2,
  Plus,
  Search
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { menus, isLoadingMenus, fetchMenus, menuPlanningComplete, reset } = useMenuStore()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchMenus()
  }, [fetchMenus])

  const handleCreateNewMenu = () => {
    reset();
    navigate("/menu/new");
  };

  const filteredMenus = menus.filter(menu => 
    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar className="border-r border-gray-200 bg-gradient-to-b from-white to-gray-50">
      <SidebarHeader>
        <div className="flex items-center justify-between px-3 py-4">
          <div className="flex items-center gap-3">
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
          <button
            onClick={handleCreateNewMenu}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors duration-200"
            title="Create New Menu"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-purple-950/70 px-3 py-3 uppercase tracking-wider">
            Your Menus
          </SidebarGroupLabel>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search menus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoadingMenus ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                </div>
              ) : filteredMenus.length === 0 ? (
                <div className="text-sm text-gray-500 px-6 py-2">
                  {searchQuery ? "No menus match your search" : "No menus created yet"}
                </div>
              ) : (
                filteredMenus.map((menu) => {
                  const isActive = location.pathname === `/menu/${menu.id}`;
                  return (
                    <SidebarMenuItem key={menu.id}>
                      <Link 
                        to={`/menu/${menu.id}`}
                        className={`group flex items-center gap-3 mx-1 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-purple-100 text-purple-900"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <span className={`text-sm font-medium transition-colors duration-200 ${
                          isActive
                            ? "text-purple-900"
                            : "text-gray-700 group-hover:text-purple-900"
                        }`}>
                          {menu.name}
                        </span>
                      </Link>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div 
                  onClick={() => signOut()}
                  className="group flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-red-50 cursor-pointer"
                >
                  <div className="p-1.5 rounded-md bg-white shadow-sm group-hover:bg-red-100">
                    <LogOut className="h-4 w-4 text-gray-600 group-hover:text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">
                    Sign Out
                  </span>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
