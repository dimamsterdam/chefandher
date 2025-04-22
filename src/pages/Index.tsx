
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ChefHat, Sparkles, CalendarDays } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FeatureCard } from "@/components/welcome/FeatureCard";

const Index = () => {
  const navigate = useNavigate();
  const { createNewMenu, menus } = useMenuStore();
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);

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
            disabled={isCreatingMenu}
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
        {recentMenus.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Recent Menus</h2>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
