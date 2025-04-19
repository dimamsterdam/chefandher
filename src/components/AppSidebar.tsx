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
  Search,
  Trash2
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { menus, isLoadingMenus, fetchMenus, menuPlanningComplete, reset, deleteMenu, saveMenu, createNewMenu } = useMenuStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [menuToDelete, setMenuToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreatingMenu, setIsCreatingMenu] = useState(false)

  useEffect(() => {
    fetchMenus()
  }, [fetchMenus])

  const handleCreateNewMenu = async () => {
    setIsCreatingMenu(true);
    try {
      const newMenuId = await createNewMenu();
      if (newMenuId) {
        await fetchMenus();
        navigate(`/menu/${newMenuId}`);
      } else {
        toast.error('An unexpected error occurred');
      }
    } catch (error) {
      console.error('Failed to create or navigate to new menu:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreatingMenu(false);
    }
  };

  const handleDeleteMenu = async () => {
    if (!menuToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteMenu(menuToDelete);
      setMenuToDelete(null);
      if (location.pathname === `/menu/${menuToDelete}`) {
        navigate("/menu/new");
      }
    } catch (error) {
      console.error('Failed to delete menu:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMenus = menus.filter(menu => 
    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
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
              disabled={isCreatingMenu}
            >
              {isCreatingMenu ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
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
                        <div className="relative flex items-center justify-between mx-1 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-gray-100">
                          <Link 
                            to={`/menu/${menu.id}`}
                            className={`flex-grow flex items-center gap-3 ${
                              isActive
                                ? "text-purple-900"
                                : "text-gray-700 hover:text-purple-900"
                            }`}
                          >
                            <span className={`text-sm font-medium transition-colors duration-200`}>
                              {menu.name}
                            </span>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setMenuToDelete(menu.id);
                            }}
                            className="absolute right-2 opacity-0 hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600"
                            title="Delete menu"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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

      <Dialog open={!!menuToDelete} onOpenChange={() => setMenuToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this menu? This action cannot be undone and will permanently delete all courses, recipes, and documents associated with this menu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMenuToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMenu}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Menu'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
