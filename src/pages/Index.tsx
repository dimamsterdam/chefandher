
import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Plus, Minus, Save, Trash2, GripVertical, ChefHat, RefreshCw, Loader2 } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  const { 
    name, 
    guestCount, 
    prepDays, 
    courses, 
    setName, 
    setGuestCount, 
    setPrepDays, 
    addCourse, 
    removeCourse,
    reorderCourses,
    saveMenu,
    generateRecipe 
  } = useMenuStore();
  
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const handleAddCourse = () => {
    if (!newCourseTitle.trim()) {
      toast.error("Please enter a course title");
      return;
    }
    addCourse({
      title: newCourseTitle,
      order: courses.length,
    });
    setNewCourseTitle("");
    toast.success("Course added successfully");
  };

  const handleGenerateRecipe = async (courseId: string) => {
    setGeneratingFor(courseId);
    try {
      await generateRecipe(courseId);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleSave = async () => {
    if (!name) {
      toast.error("Please enter a menu name");
      return;
    }
    if (courses.length === 0) {
      toast.error("Please add at least one course");
      return;
    }
    await saveMenu();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-xl p-8 max-w-4xl mx-auto"
        >
          <h1 className="text-3xl font-bold mb-6">Menu Planning</h1>
          
          {/* Menu Details */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2">Menu Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter menu name (e.g., Christmas Menu)"
                className="max-w-md"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Guests</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{guestCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(guestCount + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Preparation Days</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrepDays(Math.max(1, prepDays - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{prepDays}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrepDays(prepDays + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Courses */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Courses</h2>
            
            <Reorder.Group 
              axis="y" 
              values={courses} 
              onReorder={reorderCourses}
              className="space-y-4"
            >
              {courses.map((course) => (
                <Reorder.Item
                  key={course.id}
                  value={course}
                  className="flex flex-col p-4 glass rounded-lg cursor-move bg-white"
                >
                  <div className="flex items-center space-x-4">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <span className="flex-grow">{course.title}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          handleGenerateRecipe(course.id);
                        }}
                        disabled={generatingFor === course.id}
                      >
                        {generatingFor === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : course.recipe ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <ChefHat className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCourse(course.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {course.recipe && (
                    <Accordion type="single" collapsible className="w-full mt-4">
                      <AccordionItem value="recipe">
                        <AccordionTrigger>View Recipe</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div>
                              <h4 className="font-medium mb-2">Ingredients:</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {course.recipe.ingredients.map((ingredient, idx) => (
                                  <li key={idx}>{ingredient}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Instructions:</h4>
                              <ol className="list-decimal pl-5 space-y-2">
                                {course.recipe.instructions.map((instruction, idx) => (
                                  <li key={idx}>{instruction}</li>
                                ))}
                              </ol>
                            </div>
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
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="flex space-x-2">
              <Input
                type="text"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="Enter course title"
                className="flex-grow"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCourse();
                  }
                }}
              />
              <Button onClick={handleAddCourse}>
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8">
            <Button onClick={handleSave} className="w-full md:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Save Menu
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
