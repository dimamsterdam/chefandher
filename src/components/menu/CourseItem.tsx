
import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, RefreshCw, Wand2, Trash2, GripVertical, Loader2, Check, X, ChefHat } from "lucide-react";
import { Course } from "@/types/database.types";
import ReactMarkdown from 'react-markdown';

interface CourseItemProps {
  course: Course;
  isEditing: boolean;
  generatingFor: string | null;
  generatingRecipeForCourse: string | null;
  menuPlanningComplete: boolean;
  onStartEditing: (course: Course) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onGenerateRecipe: (courseId: string) => void;
  onRemoveCourse: (courseId: string) => void;
  editingTitle: string;
  onEditingTitleChange: (value: string) => void;
  openRecipe: string | null;
  onToggleRecipe: (courseId: string | null) => void;
  onOpenCookingView?: (course: Course) => void;
}

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
}: CourseItemProps) => {
  return (
    <div className="flex flex-col">
      <Reorder.Item
        value={course}
        className={`flex flex-col p-4 glass rounded-lg ${menuPlanningComplete ? 'cursor-default' : 'cursor-move'} bg-white transition-colors ${course.recipe ? 'bg-purple-50/50' : ''}`}
        dragListener={!menuPlanningComplete}
      >
        <div className="flex items-center space-x-4">
          {!menuPlanningComplete && (
            <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          )}
          {isEditing ? (
            <div className="flex-grow flex items-center gap-2">
              <Input
                value={editingTitle}
                onChange={(e) => onEditingTitleChange(e.target.value)}
                className="flex-grow"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onSaveEditing();
                  }
                }}
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onSaveEditing}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancelEditing}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex-grow">
              <span 
                className={`font-medium ${!menuPlanningComplete ? 'hover:text-purple-600 cursor-pointer' : ''}`}
                onClick={() => !menuPlanningComplete && onStartEditing(course)}
              >
                {course.title}
              </span>
              {course.description && (
                <p className="text-sm text-gray-600 italic mt-0.5">
                  {course.description}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            {course.recipe && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleRecipe(openRecipe === course.id ? null : course.id)}
                  className={`transition-colors ${openRecipe === course.id ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenCookingView && onOpenCookingView(course)}
                  className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                  title="Cooking View"
                >
                  <ChefHat className="h-4 w-4" />
                </Button>
              </>
            )}
            {!menuPlanningComplete && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onGenerateRecipe(course.id)}
                  disabled={!!generatingFor || generatingRecipeForCourse !== null}
                  className={`relative ${
                    course.recipe 
                      ? 'text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300' 
                      : ''
                  } ${
                    generatingRecipeForCourse === course.id 
                      ? 'bg-purple-50' 
                      : ''
                  }`}
                >
                  {generatingRecipeForCourse === course.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : course.recipe ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveCourse(course.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={generatingFor === course.id || generatingRecipeForCourse === course.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </Reorder.Item>

      {course.recipe && openRecipe === course.id && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 ml-4 glass rounded-lg bg-white p-4 overflow-hidden"
        >
          <div className="space-y-4">
            {course.recipe.ingredients && course.recipe.ingredients.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-gray-700">Ingredients:</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  {course.recipe.ingredients.map((ingredient, idx) => (
                    <li key={idx}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            )}
            {course.recipe.instructions && course.recipe.instructions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-gray-700">Instructions:</h4>
                <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                  {course.recipe.instructions.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ol>
              </div>
            )}
            {course.recipe.prep_time_minutes && course.recipe.cook_time_minutes && (
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Prep Time:</span>{" "}
                  {course.recipe.prep_time_minutes} minutes
                </div>
                <div>
                  <span className="font-medium">Cook Time:</span>{" "}
                  {course.recipe.cook_time_minutes} minutes
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
