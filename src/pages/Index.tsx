
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, Plus, Rocket, Star, Award } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

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
      icon: Star,
      title: "AI-Powered Menu Creation",
      description: "Generate professional menus with the help of AI in minutes"
    },
    {
      icon: Rocket,
      title: "Smart Recipe Generation",
      description: "Get detailed recipes and cooking instructions instantly"
    },
    {
      icon: Award,
      title: "Professional Planning",
      description: "Organize prep tasks and shopping lists effortlessly"
    }
  ];

  const recentMenus = menus.slice(0, 8);
  const hasMenus = recentMenus.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-white to-white px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Welcome to Chef & Her
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              Your AI-powered culinary companion. Create stunning menus, generate recipes, 
              and manage your kitchen like a professional chef.
            </p>
            <div className="mt-10">
              <Button
                size="lg"
                onClick={handleCreateMenu}
                disabled={isCreatingMenu}
                className="bg-primary hover:bg-primary/90 text-white px-8"
              >
                {isCreatingMenu ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : hasMenus ? (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Create New Menu
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Menu
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Features grid */}
          <div className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div 
                  key={feature.title}
                  className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="mt-2 text-sm text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Menus Section */}
      {hasMenus && (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight mb-8">Recent Menus</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentMenus.map((menu) => (
              <Card 
                key={menu.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/menu/${menu.id}`)}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg group-hover:text-primary transition-colors">
                    <ChefHat className="h-4 w-4" />
                    {menu.name || "Untitled Menu"}
                  </CardTitle>
                  <CardDescription>
                    {menu.guest_count} guest{menu.guest_count !== 1 ? 's' : ''} • {menu.prep_days} day{menu.prep_days !== 1 ? 's' : ''} prep
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Created {new Date(menu.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
