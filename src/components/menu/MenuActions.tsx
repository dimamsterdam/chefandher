
import { Button } from "@/components/ui/button";
import { ChefHat, Loader2, Wand2 } from "lucide-react";

interface MenuActionsProps {
  name: string;
  generatingMenu: boolean;
  showRegenerationConfirmation: boolean;
  onGenerateMenu: (withRecipes: boolean) => void;
}

export const MenuActions = ({
  name,
  generatingMenu,
  showRegenerationConfirmation,
  onGenerateMenu,
}: MenuActionsProps) => {
  return (
    <div className="flex justify-center space-x-4 my-6">
      <Button
        onClick={() => onGenerateMenu(true)}
        disabled={!name.trim() || generatingMenu || showRegenerationConfirmation}
        className="min-w-[200px]"
      >
        {generatingMenu ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {showRegenerationConfirmation ? "Confirm Regeneration..." : "Generating Menu & Recipes..."}
          </>
        ) : (
          <>
            <ChefHat className="h-4 w-4 mr-2" />
            Generate Menu with Recipes
          </>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={() => onGenerateMenu(false)}
        disabled={!name.trim() || generatingMenu || showRegenerationConfirmation}
        className="min-w-[200px]"
      >
        {generatingMenu ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {showRegenerationConfirmation ? "Confirm Regeneration..." : "Generating Menu..."}
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Menu Only
          </>
        )}
      </Button>
    </div>
  );
};
