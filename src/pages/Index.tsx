
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ChefHat, Clock, Users, Utensils, ArrowRight } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();
  const { menus, reset, setName, fetchMenus } = useMenuStore();
  
  React.useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleCreateMenu = () => {
    reset();
    setName("New Menu");
    navigate("/menu/new");
  };

  const features = [
    {
      icon: ChefHat,
      title: "Professional Menu Planning",
      description: "Create restaurant-quality menus with AI assistance"
    },
    {
      icon: Clock,
      title: "Time Management",
      description: "Organize prep schedules and cooking timelines"
    },
    {
      icon: Users,
      title: "Guest Management",
      description: "Scale recipes and portions automatically"
    },
    {
      icon: Utensils,
      title: "Recipe Generation",
      description: "Get detailed recipes and cooking instructions"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {menus.length === 0 ? (
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold mb-2">Welcome to Chef & Her</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Your personal AI-powered menu planning assistant. Create professional menus, 
                generate recipes, and manage your kitchen with ease.
              </p>
            </div>

            <Button 
              onClick={handleCreateMenu}
              size="lg"
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              Create Your First Menu
              <ArrowRight className="ml-2" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {features.map((feature, index) => (
                <Card key={index} className="text-left hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                      <CardTitle>{feature.title}</CardTitle>
                    </div>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Your Menus</h1>
              <Button onClick={handleCreateMenu}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Menu
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menus.map((menu) => (
                <Card 
                  key={menu.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/menu/${menu.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
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
