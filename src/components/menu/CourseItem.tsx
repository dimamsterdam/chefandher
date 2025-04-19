
import { useState } from "react";
import { motion } from "framer-motion";
import { Reorder, useDragControls } from "framer-motion";
import { 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  MoreHorizontal, 
  GripHorizontal, 
  Loader2,
  ChevronsRight,
  ChevronsLeft,
  Utensils
} from "lucide-react";
import { Course, CourseType } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  course: Course;
  isEditing: boolean;
  generatingFor: string | null;
  generatingRecipeForCourse: string | null;
  menuPlanningComplete: boolean;
  onStartEditing: (course: Course) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onGenerateRecipe: (courseId: string) => void;
  onRemoveCourse: (id: string) => void;
  editingTitle: string;
  onEditingTitleChange: (value: string) => void;
  openRecipe: string | null;
  onToggleRecipe: (id: string | null) => void;
  onOpenCookingView: (course: Course) => void;
  onChangeCourseType?: (id: string, courseType: CourseType) => void;
  onSetParentCourse?: (id: string, parentId: string | null) => void;
  availableMainCourses?: Course[];
};

export const CourseItem = ({ 
  course, 
  isEditing, 
  generatingFor, 
  generatingRecipeForCourse, 
  menuPlanningComplete,
  onStartEditing, 
  onSaveEditing, 
  onCancelEditing, 
  onGenerateRecipe, 
  onRemoveCourse,
  editingTitle,
  onEditingTitleChange,
  openRecipe,
  onToggleRecipe,
  onOpenCookingView,
  onChangeCourseType,
  onSetParentCourse,
  availableMainCourses = []
}: Props) => {
  const [showDetails, setShowDetails] = useState(false);
  const dragControls = useDragControls();
  const isRecipeOpen = openRecipe === course.id;
  const showIngredientsList = isRecipeOpen && course.recipe;
  const hasRecipe = !!course.recipe;
  const isGeneratingRecipe = course.id === generatingFor || course.id === generatingRecipeForCourse;
  const isSideDish = course.courseType === 'side' && course.parentCourseId;
  
  const renderCourseTypeDropdown = () => {
    if (!onChangeCourseType) return null;
    
    return (
      <div className="flex items-center space-x-2 ml-2">
        <Select
          value={course.courseType || "main"}
          onValueChange={(value) => onChangeCourseType(course.id, value as CourseType)}
          disabled={menuPlanningComplete}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Course type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="main">Main</SelectItem>
            <SelectItem value="side">Side</SelectItem>
            <SelectItem value="dessert">Dessert</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };
  
  const renderParentCourseDropdown = () => {
    if (!onSetParentCourse || course.courseType !== 'side') return null;
    
    const mainCourses = availableMainCourses.filter(c => c.id !== course.id);
    
    return (
      <div className="flex items-center space-x-2 ml-2">
        <Select
          value={course.parentCourseId || "none"}
          onValueChange={(value) => onSetParentCourse(course.id, value === "none" ? null : value)}
          disabled={menuPlanningComplete}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select main course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {mainCourses.map(mainCourse => (
              <SelectItem key={mainCourse.id} value={mainCourse.id}>
                {mainCourse.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Reorder.Item
      value={course}
      dragListener={!menuPlanningComplete}
      dragControls={dragControls}
      className={cn(
        "rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden transition-all", 
        isSideDish && "ml-10"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {!menuPlanningComplete && (
            <div 
              className="mt-1 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripHorizontal className="h-5 w-5 text-gray-400" />
            </div>
          )}
          
          <div className="flex-grow">
            <div className="flex flex-wrap items-center gap-2">
              {isEditing ? (
                <div className="flex-grow">
                  <Input
                    value={editingTitle}
                    onChange={(e) => onEditingTitleChange(e.target.value)}
                    className="text-base"
                    autoFocus
                  />
                </div>
              ) : (
                <h3 className="text-xl font-semibold mr-2">
                  {course.title}
                </h3>
              )}
              
              {course.courseType && !isEditing && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "capitalize",
                    course.courseType === 'starter' && "bg-blue-50 text-blue-700 border-blue-200",
                    course.courseType === 'main' && "bg-purple-50 text-purple-700 border-purple-200",
                    course.courseType === 'side' && "bg-green-50 text-green-700 border-green-200",
                    course.courseType === 'dessert' && "bg-pink-50 text-pink-700 border-pink-200"
                  )}
                >
                  {course.courseType}
                </Badge>
              )}

              {isEditing && renderCourseTypeDropdown()}
              {isEditing && renderParentCourseDropdown()}
              
              {hasRecipe && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => onOpenCookingView(course)}>
                  <Utensils className="h-3 w-3 mr-1" />
                  Cook
                </Badge>
              )}
            </div>
            
            {course.description && !isEditing && (
              <p className="text-gray-600 text-sm mt-1">{course.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0" 
                  onClick={onCancelEditing}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0" 
                  onClick={onSaveEditing}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                {!menuPlanningComplete && (
                  <>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0" 
                      onClick={() => onStartEditing(course)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRemoveCourse(course.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Course
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Expandable content */}
        {showDetails && !isEditing && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              {!hasRecipe ? (
                <Button
                  onClick={() => onGenerateRecipe(course.id)}
                  disabled={isGeneratingRecipe}
                  className="flex-grow md:flex-grow-0"
                >
                  {isGeneratingRecipe ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Recipe...
                    </>
                  ) : (
                    "Generate Recipe"
                  )}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => onToggleRecipe(isRecipeOpen ? null : course.id)}
                  className="flex-grow md:flex-grow-0"
                >
                  {isRecipeOpen ? "Hide Recipe" : "Show Recipe"}
                  {isRecipeOpen ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              )}
              
              {hasRecipe && (
                <Button 
                  variant="default"
                  onClick={() => onOpenCookingView(course)}
                  className="flex-grow md:flex-grow-0"
                >
                  Cooking View
                </Button>
              )}
            </div>
            
            {showIngredientsList && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 space-y-4"
              >
                <div>
                  <h4 className="font-medium mb-2">Ingredients:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {course.recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-gray-600">{ingredient}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Instructions:</h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    {course.recipe.instructions.map((instruction, index) => (
                      <li key={index} className="text-gray-600">
                        {instruction.replace(/^Step \d+:\s*/i, '')}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <div>Prep time: {course.recipe.prep_time_minutes} min</div>
                  <div>Cook time: {course.recipe.cook_time_minutes} min</div>
                  <div>Servings: {course.recipe.servings}</div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </Reorder.Item>
  );
};
