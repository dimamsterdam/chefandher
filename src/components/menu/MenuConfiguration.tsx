
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Pencil, Check } from "lucide-react";

interface MenuConfigurationProps {
  name: string;
  guestCount: number;
  desiredCourseCount: number;
  prepDays: number;
  menuPlanningComplete: boolean;
  courseCount: number;
  onNameChange: (value: string) => void;
  onGuestCountChange: (value: number) => void;
  onDesiredCourseCountChange: (value: number) => void;
  onPrepDaysChange: (value: number) => void;
  onToggleEditMode: () => void;
}

export const MenuConfiguration = ({
  name,
  guestCount,
  desiredCourseCount,
  prepDays,
  menuPlanningComplete,
  courseCount,
  onNameChange,
  onGuestCountChange,
  onDesiredCourseCountChange,
  onPrepDaysChange,
  onToggleEditMode,
}: MenuConfigurationProps) => {
  return (
    <div className="space-y-6 mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Menu Configuration</h2>
        <Button 
          onClick={onToggleEditMode}
          variant={menuPlanningComplete ? "outline" : "default"}
          className={menuPlanningComplete ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : ""}
          disabled={courseCount === 0 || !name.trim()}
        >
          {menuPlanningComplete ? (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Menu
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Mark as Complete
            </>
          )}
        </Button>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Menu Name</label>
        <div className="flex items-center space-x-2 max-w-md">
          {menuPlanningComplete ? (
            <div className="text-lg font-medium">{name}</div>
          ) : (
            <Input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter menu name"
              className="flex-grow"
            />
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Number of Guests</label>
          <div className="flex items-center space-x-2">
            {menuPlanningComplete ? (
              <div className="text-lg font-medium">{guestCount}</div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onGuestCountChange(Math.max(1, guestCount - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center">{guestCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onGuestCountChange(guestCount + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">How many courses</label>
          <div className="flex items-center space-x-2">
            {menuPlanningComplete ? (
              <div className="text-lg font-medium">{desiredCourseCount}</div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDesiredCourseCountChange(Math.max(1, desiredCourseCount - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center">{desiredCourseCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDesiredCourseCountChange(desiredCourseCount + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Preparation Days</label>
          <div className="flex items-center space-x-2">
            {menuPlanningComplete ? (
              <div className="text-lg font-medium">{prepDays}</div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPrepDaysChange(Math.max(1, prepDays - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center">{prepDays}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPrepDaysChange(prepDays + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
