
import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Plus, Minus, Trash2, GripVertical, ChefHat, RefreshCw, Loader2, BookOpen, Check, X, Wand2, CheckCircle2 } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
    generateRecipe,
    updateCourse,
    generateMenu,
    menuPlanningComplete,
    setMenuPlanningComplete,
    menuGenerated,
    originalMenuName,
    isGeneratingFullMenu
  } = useMenuStore();
  
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [generatingMenu, setGeneratingMenu] = useState(false);
  const [desiredCourseCount, setDesiredCourseCount] = useState(courses.length || 3);

  const shouldWandBeActive = !name.trim() || !menuGenerated || (menuGenerated && name !== originalMenuName);

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
    if (generatingFor) return;
    
    setGeneratingFor(courseId);
    try {
      console.log(`Generating recipe for course ID: ${courseId}`);
      await generateRecipe(courseId, `Please adjust all ingredient quantities to serve ${guestCount} people.`);
      toast.success("Recipe generated successfully!");
    } catch (error) {
      console.error('Recipe generation failed:', error);
      toast.error('Failed to generate recipe. Please try again.');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleGenerateMenu = async () => {
    if (!name.trim()) {
      toast.error("Please enter a menu name first");
      return;
    }
    
    if (menuGenerated && name !== originalMenuName && courses.length > 0) {
      toast.warning("Generating a new menu will delete all existing courses. Continue?", {
        action: {
          label: "Continue",
          onClick: () => generateNewMenu()
        },
        cancel: {
          label: "Cancel",
          onClick: () => {}
        }
      });
      return;
    }

    generateNewMenu();
  };

  const generateNewMenu = async () => {
    setGeneratingMenu(true);
    try {
      const prompt = `Create a complete ${name} menu for ${guestCount} guests with approximately ${desiredCourseCount} courses that specifically focuses on the theme of ${name}.`;
      
      // Show an initial toast message
      toast.message("Generating your complete menu and recipes...", {
        description: "This could take a minute or two. Please wait.",
        duration: 10000,
      });
      
      await generateMenu(prompt);
      toast.success("Menu and recipes generated successfully!");
    } catch (error) {
      console.error('Menu generation failed:', error);
      toast.error('Failed to generate menu. Please try again.');
    } finally {
      setGeneratingMenu(false);
    }
  };

  const startEditing = (course: { id: string; title: string }) => {
    setEditingCourseId(course.id);
    setEditingTitle(course.title);
  };

  const saveEditing = () => {
    if (editingCourseId && editingTitle.trim()) {
      updateCourse(editingCourseId, { title: editingTitle.trim() });
      setEditingCourseId(null);
      setEditingTitle("");
      toast.success("Course title updated");
    }
  };

  const cancelEditing = () => {
    setEditingCourseId(null);
    setEditingTitle("");
  };

  const handleCourseClick = (courseId: string) => {
    if (editingCourseId) return; // Don't toggle if we're editing
    console.log(`Toggling recipe for course ID: ${courseId}, current openRecipe: ${openRecipe}`);
    setOpenRecipe(openRecipe === courseId ? null : courseId);
  };

  const handleCompleteMenuPlanning = () => {
    if (courses.length === 0) {
      toast.error("Please add at least one course before completing menu planning");
      return;
    }

    if (!name.trim()) {
      toast.error("Please name your menu before completing menu planning");
      return;
    }

    if (!courses.every(course => course.recipe)) {
      toast.warning("Not all courses have recipes generated. Are you sure you want to proceed?", {
        action: {
          label: "Confirm",
          onClick: () => {
            setMenuPlanningComplete(true);
            toast.success("Menu planning completed! You can now access other sections.");
          }
        }
      });
      return;
    }

    setMenuPlanningComplete(true);
    toast.success("Menu planning completed! You can now access other sections.");
  };

  // For debugging
  console.log('Courses:', courses);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-xl p-8 max-w-4xl mx-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Menu Planning</h1>
            <Button 
              onClick={handleCompleteMenuPlanning}
              variant={menuPlanningComplete ? "outline" : "default"}
              className={menuPlanningComplete ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : ""}
              disabled={courses.length === 0 || !name.trim() || generatingMenu || isGeneratingFullMenu}
            >
              {menuPlanningComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> 
                  Planning Complete
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Complete
                </>
              )}
            </Button>
          </div>
          
          {/* Menu Details */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2">Menu Name</label>
              <div className="flex items-center space-x-2 max-w-md">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter menu name"
                  className="flex-grow"
                  disabled={menuPlanningComplete || isGeneratingFullMenu}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!shouldWandBeActive || generatingMenu || menuPlanningComplete || isGeneratingFullMenu}
                  onClick={handleGenerateMenu}
                  className={`transition-colors ${
                    shouldWandBeActive && !menuPlanningComplete && !isGeneratingFullMenu
                      ? 'text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300' 
                      : 'text-gray-400 border-gray-200'
                  }`}
                >
                  {generatingMenu || isGeneratingFullMenu ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {isGeneratingFullMenu && (
                <p className="mt-2 text-sm text-purple-600">Generating your complete menu with recipes...</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Guests</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    disabled={menuPlanningComplete || isGeneratingFullMenu}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{guestCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(guestCount + 1)}
                    disabled={menuPlanningComplete || isGeneratingFullMenu}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">How many courses</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDesiredCourseCount(Math.max(1, desiredCourseCount - 1))}
                    disabled={menuPlanningComplete || isGeneratingFullMenu}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{desiredCourseCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDesiredCourseCount(desiredCourseCount + 1)}
                    disabled={menuPlanningComplete || isGeneratingFullMenu}
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
                    disabled={menuPlanningComplete || isGeneratingFullMenu}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{prepDays}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrepDays(prepDays + 1)}
                    disabled={menuPlanningComplete || isGeneratingFullMenu}
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
            
            {isGeneratingFullMenu ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
                <div>
                  <p className="text-lg font-medium">Generating your complete menu</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a minute or two...</p>
                </div>
              </div>
            ) : courses.length > 0 ? (
              <Reorder.Group 
                axis="y" 
                values={courses} 
                onReorder={menuPlanningComplete ? undefined : reorderCourses}
                className="space-y-4"
              >
                {courses.map((course) => {
                  // Check if course has a recipe and log for debugging
                  console.log(`Course ${course.id}: ${course.title}`, 
                              `Has recipe: ${Boolean(course.recipe)}`, 
                              course.recipe ? "Recipe found" : "No recipe");
                  
                  return (
                    <Reorder.Item
                      key={course.id}
                      value={course}
                      className={`flex flex-col p-4 glass rounded-lg ${menuPlanningComplete ? 'cursor-default' : 'cursor-move'} transition-colors ${
                        course.recipe ? 'bg-purple-50/50 hover:bg-purple-100/60' : ''
                      }`}
                      dragListener={!menuPlanningComplete}
                    >
                      <div className="flex items-center space-x-4">
                        {!menuPlanningComplete && (
                          <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                        {editingCourseId === course.id ? (
                          <div className="flex-grow flex items-center gap-2">
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="flex-grow"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveEditing();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEditing}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className={`flex-grow flex items-center gap-2 ${
                              !menuPlanningComplete ? 'cursor-pointer group' : ''
                            }`}
                          >
                            <div 
                              className={`flex-grow font-medium ${
                                course.recipe 
                                  ? 'text-purple-800 flex items-center gap-2 cursor-pointer' 
                                  : ''
                              } ${
                                !menuPlanningComplete && !course.recipe
                                  ? 'hover:text-purple-600'
                                  : !menuPlanningComplete 
                                    ? 'hover:text-purple-900'
                                    : ''
                              }`}
                              onClick={() => !menuPlanningComplete && course.recipe && handleCourseClick(course.id)}
                              onDoubleClick={() => !menuPlanningComplete && !editingCourseId && startEditing(course)}
                            >
                              {course.recipe && (
                                <BookOpen 
                                  className={`h-4 w-4 ${
                                    openRecipe === course.id 
                                      ? 'text-purple-700' 
                                      : 'text-purple-600'
                                  }`}
                                />
                              )}
                              {course.title}
                              {course.recipe && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">
                                  Recipe Ready
                                </span>
                              )}
                            </div>
                            
                            {course.recipe && !menuPlanningComplete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCourseClick(course.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                {openRecipe === course.id ? 'Hide Recipe' : 'View Recipe'}
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {!menuPlanningComplete && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleGenerateRecipe(course.id)}
                                disabled={!!generatingFor || isGeneratingFullMenu}
                                className={`relative ${
                                  course.recipe 
                                    ? 'text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300' 
                                    : ''
                                } ${
                                  generatingFor === course.id 
                                    ? 'bg-purple-50' 
                                    : ''
                                }`}
                              >
                                {generatingFor === course.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="sr-only">Generating recipe...</span>
                                  </>
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
                                disabled={generatingFor === course.id || isGeneratingFullMenu}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {course.recipe && openRecipe === course.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 pt-4 border-t border-purple-100"
                        >
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2 text-gray-700">Ingredients:</h4>
                              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                {course.recipe.ingredients.map((ingredient, idx) => (
                                  <li key={idx}>{ingredient}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-gray-700">Instructions:</h4>
                              <ol className="list-decimal pl-5 space-y-2 text-gray-600">
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
                        </motion.div>
                      )}
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center bg-gray-50 rounded-lg">
                <Wand2 className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-lg font-medium">No courses yet</p>
                  <p className="text-sm text-gray-500 mt-1">Enter a menu name and click the magic wand to generate a complete menu with recipes</p>
                </div>
              </div>
            )}

            {!menuPlanningComplete && !isGeneratingFullMenu && (
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
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
