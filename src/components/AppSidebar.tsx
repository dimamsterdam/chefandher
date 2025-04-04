
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "./ui/alert-dialog"
import { toast } from "sonner"

// Fixed menu items
const navigationItems = [
  {
    title: "Menus",
    path: "/",
    icon: Menu,
  }
]

// Menu-specific items that become active when a menu is completed
const menuSpecificItems = [
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
  const { menuPlanningComplete, menuId, setName, setGuestCount, setPrepDays, setCourses, setMenuId, setMenuPlanningComplete, reset } = useMenuStore()
  const [savedMenus, setSavedMenus] = useState([])
  const [openMenus, setOpenMenus] = useState([])
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [menuToDelete, setMenuToDelete] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Fetch saved menus when the component mounts
  useEffect(() => {
    fetchSavedMenus()
  }, [menuId])

  const fetchSavedMenus = async () => {
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching menus:', error)
      return
    }

    setSavedMenus(menus || [])
    
    // If there's a current menuId, set it as active
    if (menuId) {
      setActiveMenuId(menuId)
      setOpenMenus([menuId])
    } else if (menus && menus.length > 0) {
      // If no active menu but we have saved menus, set the first one as open
      setOpenMenus([menus[0].id])
    }
  }

  // Handle toggling a menu's open/closed state
  const toggleMenuOpen = (menuId) => {
    setOpenMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId) 
        : [...prev, menuId]
    )
  }

  // Handle selecting a menu
  const handleSelectMenu = async (menu) => {
    setActiveMenuId(menu.id)
    
    // Fetch the courses for this menu
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        order,
        recipes (
          id,
          title,
          ingredients,
          instructions,
          prep_time_minutes,
          cook_time_minutes,
          servings,
          course_id,
          created_by
        )
      `)
      .eq('menu_id', menu.id)
      .order('order', { ascending: true })
    
    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      return
    }

    // Map the courses to the expected format
    const formattedCourses = coursesData.map(course => ({
      id: crypto.randomUUID(), // Create a client ID for each course
      dbId: course.id, // Store the database ID
      title: course.title,
      order: course.order,
      recipe: course.recipes && course.recipes.length > 0 ? course.recipes[0] : undefined
    }))

    // Update the menu store with this menu's details
    setMenuId(menu.id)
    setName(menu.name)
    setGuestCount(menu.guest_count)
    setPrepDays(menu.prep_days)
    setCourses(formattedCourses)
    setMenuPlanningComplete(true)
  }

  // Handle deleting a menu
  const handleDeleteClick = (e, menu) => {
    e.stopPropagation() // Prevent triggering the menu selection
    setMenuToDelete(menu)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteMenu = async () => {
    if (!menuToDelete) return
    
    try {
      // Delete the menu from the database
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuToDelete.id)
      
      if (error) throw error

      // If the deleted menu was the active one, reset the store
      if (activeMenuId === menuToDelete.id) {
        reset()
        setActiveMenuId(null)
      }
      
      // Refresh the menus list
      fetchSavedMenus()
      toast.success(`Menu "${menuToDelete.name}" deleted successfully`)
    } catch (error) {
      console.error('Error deleting menu:', error)
      toast.error('Failed to delete menu')
    } finally {
      setDeleteDialogOpen(false)
      setMenuToDelete(null)
    }
  }

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
              {/* Main Navigation Items */}
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path && !activeMenuId}
                    className="group flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                  >
                    <Link to={item.path} className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md transition-colors duration-200 bg-white shadow-sm group-hover:bg-purple-50">
                        <item.icon className="h-4 w-4 transition-colors duration-200 text-gray-600 group-hover:text-purple-600" />
                      </div>
                      <span className="text-sm font-medium transition-colors duration-200 text-gray-700 group-hover:text-purple-900">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Saved Menus */}
              {savedMenus.map((menu) => (
                <SidebarMenuItem key={menu.id}>
                  <Collapsible 
                    open={openMenus.includes(menu.id)}
                    onOpenChange={() => toggleMenuOpen(menu.id)}
                    className="w-full"
                  >
                    <CollapsibleTrigger className="w-full">
                      <div 
                        onClick={() => handleSelectMenu(menu)}
                        className={`flex items-center justify-between w-full mx-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
                          activeMenuId === menu.id
                            ? "bg-purple-100 text-purple-900"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${activeMenuId === menu.id ? 'bg-purple-200' : 'bg-white shadow-sm'}`}>
                            <Menu className={`h-4 w-4 ${activeMenuId === menu.id ? 'text-purple-600' : 'text-gray-600'}`} />
                          </div>
                          <span className={`text-sm font-medium ${activeMenuId === menu.id ? 'text-purple-900' : 'text-gray-700'}`}>
                            {menu.name}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <button 
                            onClick={(e) => handleDeleteClick(e, menu)}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100"
                            aria-label="Delete menu"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                          </button>
                          {openMenus.includes(menu.id) ? (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronRight className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {menuSpecificItems.map((item) => {
                          const isActive = location.pathname === item.path && activeMenuId === menu.id;
                          return (
                            <SidebarMenuSubItem key={`${menu.id}-${item.path}`}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive}
                                className={`text-sm ${isActive ? 'font-medium' : ''}`}
                              >
                                <Link to={item.path} className="flex items-center gap-2">
                                  <item.icon className={`h-4 w-4 ${isActive ? 'text-purple-600' : 'text-gray-500'}`} />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              ))}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the menu "{menuToDelete?.name}" and all its associated courses and recipes. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMenu} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}
