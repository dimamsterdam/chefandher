
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute from "@/components/ProtectedRoute"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import Index from "./pages/Index"
import Auth from "./pages/Auth"
import NotFound from "./pages/NotFound"
import RecipesPage from "./pages/recipes"
import PlanningPage from "./pages/planning"
import ShoppingPage from "./pages/shopping"
import ServicePage from "./pages/service"
import { useEffect } from "react"
import { useMenuStore } from "./store/menuStore"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const AppContent = () => {
  const { checkAuth } = useMenuStore();
  
  useEffect(() => {
    // Check authentication status on app initialization
    checkAuth();
  }, [checkAuth]);
  
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <SidebarInset>
                  <div className="relative flex w-full flex-col">
                    <div className="flex-1">
                      <SidebarTrigger className="absolute left-4 top-4 z-50" />
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/recipes" element={<RecipesPage />} />
                        <Route path="/planning" element={<PlanningPage />} />
                        <Route path="/shopping" element={<ShoppingPage />} />
                        <Route path="/service" element={<ServicePage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </div>
                  </div>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppContent />
        {/* Both toaster components for compatibility */}
        <Toaster />
        <Sonner position="top-right" closeButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
