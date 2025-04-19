import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ChefHat, Clock, Users, Utensils, ArrowRight, Star, Rocket, Award } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { createNewMenu } = useMenuStore();
  const [menuName, setMenuName] = useState("");
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
      title: "AI-Powered",
      description: "Create restaurant-quality menus with AI assistance"
    },
    {
      icon: Rocket,
      title: "Lightning Fast",
      description: "Generate complete menus in minutes, not hours"
    },
    {
      icon: Award,
      title: "Professional",
      description: "Impress your guests with expertly crafted dishes"
    }
  ];

  const recentMenus = menus.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-purple-800 text-white p-8 md:p-12 animate-fade-in">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="text-center space-y-6 mb-12">
              <h1 className="text-3xl md:text-4xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90 text-gray-100">
                Welcome to Chef & Her
              </h1>
              <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
                Your personal AI-powered menu planning assistant. Create professional menus, 
                generate recipes, and manage your kitchen with ease.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="bg-white/10 rounded-2xl p-3">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm mb-1 text-white/90">{feature.title}</h3>
                    <p className="text-white/70 text-xs">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Create a New Menu</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Menu Name (Optional)</label>
                <Input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="Default: 'Untitled Menu'"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isCreatingMenu) {
                      handleCreateMenu();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleCreateMenu}
                className="w-full"
                disabled={isCreatingMenu}
              >
                {isCreatingMenu ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Menu'
                )}

              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {recentMenus.map((menu) => (
                <Card 
                  key={menu.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
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
    </div>
  );
};

export default Index;
