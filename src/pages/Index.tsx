import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMenuStore } from "@/store/menuStore";

const Index = () => {
  const navigate = useNavigate();
  const { setName, reset } = useMenuStore();
  const [menuName, setMenuName] = useState("");

  const handleCreateMenu = () => {
    if (!menuName.trim()) {
      toast.error("Please enter a menu name");
      return;
    }

    reset();
    setName(menuName.trim());
    navigate("/menu/new");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to Chef & Her</h1>
            <p className="text-gray-600">Create and manage your menus with ease</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Create a New Menu</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Menu Name</label>
                <Input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="Enter menu name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateMenu();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleCreateMenu}
                className="w-full"
                disabled={!menuName.trim()}
              >
                Create Menu
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

