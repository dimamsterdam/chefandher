import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

