
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, Trash2, Wand2, Loader2 } from "lucide-react";

interface Recipe {
  id?: string;
  course_id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
}

interface CourseProps {
  course: {
    id: string;
    title: string;
    order: number;
    description?: string | null;
    recipe?: Recipe;
  };
  onRemove: (id: string) => void;
  onUpdate: (updates: any) => void;
  onGenerateRecipe: (requirements?: string) => void;
}

export const Course: React.FC<CourseProps> = ({
  course,
  onRemove,
  onUpdate,
  onGenerateRecipe,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [requirements, setRequirements] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);

  const handleUpdate = () => {
    onUpdate({ title, description });
    setIsEditing(false);
  };

  const handleGenerateRecipe = async () => {
    setIsGenerating(true);
    try {
      await onGenerateRecipe(requirements);
      setShowRecipeForm(false);
      setRequirements("");
    } catch (error) {
      console.error("Failed to generate recipe:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="shadow-sm hover:shadow transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-grow">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-grow"
              placeholder="Course title"
            />
            <Button onClick={handleUpdate} size="sm">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        ) : (
          <CardTitle className="text-lg">{course.title}</CardTitle>
        )}
        <div className="flex gap-1">
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onRemove(course.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Course description"
            className="mb-4"
          />
        ) : (
          <p className="text-sm text-muted-foreground mb-4">{course.description || "No description provided."}</p>
        )}

        {course.recipe ? (
          <div className="space-y-2">
            <h4 className="font-medium">Recipe: {course.recipe.title}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Prep time: {course.recipe.prep_time_minutes} mins</div>
              <div>Cook time: {course.recipe.cook_time_minutes} mins</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowRecipeForm(!showRecipeForm)}>
              Regenerate Recipe
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowRecipeForm(!showRecipeForm)}
            className="w-full"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Recipe
          </Button>
        )}

        {showRecipeForm && (
          <div className="mt-4 space-y-3">
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Enter any specific requirements or preferences for this recipe..."
              className="min-h-[80px]"
            />
            <Button
              onClick={handleGenerateRecipe}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  {course.recipe ? "Regenerate Recipe" : "Generate Recipe"}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
