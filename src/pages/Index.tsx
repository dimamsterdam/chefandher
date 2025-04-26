
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ChefHat, Sparkles, CalendarDays, RefreshCw, WifiOff } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FeatureCard } from "@/components/welcome/FeatureCard";
import { isSupabaseConnectionHealthy } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { 
    createNewMenu, 
    menus, 
    isLoadingMenus, 
    fetchMenus, 
    retryFetchMenus 
  } = useMenuStore();
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');

  // Check connection status and manage menu loading
  useEffect(() => {
    const loadMenus = async () => {
      try {
        await fetchMenus();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to load menus:', error);
        setConnectionStatus('offline');
      }
    };

    loadMenus();

    // Set up connection monitoring
    const connectionCheck = setInterval(() => {
      const isHealthy = isSupabaseConnectionHealthy();
      setConnectionStatus(isHealthy ? 'connected' : 'offline');
      
      if (!isHealthy && !isLoadingMenus) {
        console.log('Connection appears unhealthy, will retry on next interval');
      }
    }, 10000);

    return () => {
      clearInterval(connectionCheck);
    };
  }, [fetchMenus, isLoadingMenus]);

  const handleCreateMenu = async () => {
    setIsCreatingMenu(true);
    try {
      const newMenuId = await createNewMenu();
      if (newMenuId) {
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

  const handleRetryConnection = async () => {
    setConnectionStatus('connecting');
    try {
      await retryFetchMenus();
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('offline');
    }
  };

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Menu Creation",
      description: "Create complete, professional menus in minutes with our advanced AI assistance"
    },
    {
      icon: ChefHat,
      title: "Smart Recipe Generation",
      description: "Get detailed recipes, ingredient lists, and cooking instructions tailored to your needs"
    },
    {
      icon: CalendarDays,
      title: "Professional Planning",
      description: "Organize preparation schedules and coordinate service timing effortlessly"
    }
  ];

  const recentMenus = menus.slice(0, 8);

  // Connection status indicator component
  const ConnectionStatus = () => {
    if (connectionStatus === 'connected' && !isLoadingMenus) {
      return null; // Don't show when everything is working
    }
    
    return (
      <div className={`fixed bottom-4 right-4 rounded-md py-2 px-4 flex items-center gap-2 shadow-md ${
        connectionStatus === 'connecting' ? 'bg-amber-100' : 
        connectionStatus === 'offline' ? 'bg-red-100' : 'bg-green-100'
      }`}>
        {connectionStatus === 'connecting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <span className="text-sm text-amber-700">Connecting...</span>
          </>
        ) : connectionStatus === 'offline' ? (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">Offline</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRetryConnection}
              className="ml-2 h-7 text-xs p-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </>
        ) : (
          <>
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-green-700">Connected</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4 py-16 space-y-24">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Welcome to Chef & Her
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your personal AI-powered menu planning assistant. Create professional menus, 
            generate recipes, and manage your kitchen with ease.
          </p>
          <Button
            onClick={handleCreateMenu}
            size="lg"
            className="mt-8"
            disabled={isCreatingMenu || connectionStatus === 'offline'}
          >
            {isCreatingMenu ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Create New Menu
              </>
            )}
          </Button>
          
          {connectionStatus === 'offline' && (
            <div className="mt-2 text-sm text-red-600">
              Connection lost. Please check your network and retry.
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        {/* Recent Menus */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Recent Menus</h2>
            {isLoadingMenus && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading menus...
              </div>
            )}
            {!isLoadingMenus && connectionStatus !== 'offline' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRetryConnection}
                className="text-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
          
          {isLoadingMenus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="opacity-50 animate-pulse">
                  <CardHeader>
                    <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 rounded mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentMenus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentMenus.map((menu) => (
                <Card 
                  key={menu.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/menu/${menu.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ChefHat className="h-4 w-4" />
                      {menu.name || "Untitled Menu"}
                    </CardTitle>
                    <CardDescription>
                      {menu.guest_count} guest{menu.guest_count !== 1 ? 's' : ''} • {menu.prep_days} day{menu.prep_days !== 1 ? 's' : ''} prep
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(menu.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
              <ChefHat className="h-10 w-10 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No recent menus found</p>
              {connectionStatus === 'offline' ? (
                <p className="text-sm text-gray-400 mt-2">
                  Please check your connection and try again
                </p>
              ) : (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleCreateMenu}
                  disabled={isCreatingMenu}
                >
                  Create your first menu
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <ConnectionStatus />
    </div>
  );
};

export default Index;
