
import { useState, useEffect, useRef } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { 
  Plus, Minus, Trash2, GripVertical, ChefHat, RefreshCw, 
  Loader2, BookOpen, Check, X, Wand2, CheckCircle2, 
  AlertCircle, AlertTriangle
} from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

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
    courseCount,
    setCourseCount,
    reset,
    isGeneratingMenu,
    isGeneratingRecipe,
    generateError,
    clearGenerateError
  } = useMenuStore();
  
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [desiredCourseCount, setDesiredCourseCount] = useState(courseCount || 3);
  const [lastGeneratedName, setLastGeneratedName] = useState(name);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  
  const editingInputRef = useRef<HTMLInputElement>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show error dialog when generation error occurs
  useEffect(() => {
    if (generateError) {
      setShowErrorDialog(true);
    }
  }, [generateError]);

  // Update lastGeneratedName when menu is successfully generated
  useEffect(() => {
    if (!isGeneratingMenu && courses.length > 0) {
      setLastGeneratedName(name);
    }
  }, [isGeneratingMenu, courses.length, name]);

  useEffect(() => {
    if (!editingCourseId) return;

    const currentCourse = courses.find(course => course.id === editingCourseId);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editingInputRef.current && 
        !editingInputRef.current.contains(event.target as Node)
      ) {
        if (currentCourse && editingTitle === currentCourse.title) {
          setEditingCourseId(null);
        } else if (editingTitle.trim()) {
          saveEditing();
        } else {
          cancelEditing();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCourseId, editingTitle, courses]);

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
    if (isGeneratingRecipe || networkStatus === 'offline') return;
    
    try {
      await generateRecipe(courseId, `Please adjust all ingredient quantities to serve ${guestCount} people.`);
      toast.success("Recipe generated successfully!");
    } catch (error) {
      console.error('Recipe generation failed:', error);
      // Toast is already shown by the store
    }
  };

  const handleGenerateMenu = async () => {
    if (isGeneratingMenu || networkStatus === 'offline') return;
    
    if (!name.trim()) {
      toast.error("Please enter a menu name first");
      return;
    }
    
    try {
      const prompt = `Create a complete ${name} menu for ${guestCount} guests with approximately ${desiredCourseCount} courses that specifically focuses on the theme of ${name}.`;
      await generateMenu(prompt);
    } catch (error) {
      console.error('Menu generation failed:', error);
      // Toast is already shown by the store
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

  // Button should be active when name is set but no menu has been generated, or name changed after generation
  const isWandButtonActive = name.trim() && !isGeneratingMenu && !menuPlanningComplete && name !== lastGeneratedName;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-xl p-8 max-w-4xl mx-auto"
        >
          {networkStatus === 'offline' && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              <span>You are currently offline. Some features may not work until you reconnect.</span>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Menu Planning</h1>
            <Button 
              onClick={handleCompleteMenuPlanning}
              variant={menuPlanningComplete ? "outline" : "default"}
              className={menuPlanningComplete ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : ""}
              disabled={courses.length === 0 || !name.trim() || isGeneratingMenu}
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
          
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2">Menu Name</label>
              <div className="flex items-center space-x-2 max-w-md">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                  placeholder="Enter menu name"
                  className="flex-grow"
                  disabled={menuPlanningComplete}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!isWandButtonActive || networkStatus === 'offline'}
                  onClick={handleGenerateMenu}
                  className={`transition-colors ${
                    isWandButtonActive && networkStatus === 'online'
                      ? 'text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300' 
                      : 'text-gray-400 border-gray-200'
                  }`}
                >
                  {isGeneratingMenu ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Guests</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    disabled={menuPlanningComplete}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{guestCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuestCount(guestCount + 1)}
                    disabled={menuPlanningComplete}
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
                    onClick={() => {
                      setDesiredCourseCount(Math.max(1, desiredCourseCount - 1));
                      setCourseCount(Math.max(1, desiredCourseCount - 1));
                    }}
                    disabled={menuPlanningComplete}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{desiredCourseCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setDesiredCourseCount(desiredCourseCount + 1);
                      setCourseCount(desiredCourseCount + 1);
                    }}
                    disabled={menuPlanningComplete}
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
                    disabled={menuPlanningComplete}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center">{prepDays}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrepDays(prepDays + 1)}
                    disabled={menuPlanningComplete}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Courses</h2>
              {isGeneratingMenu && (
                <div className="flex items-center space-x-2 text-sm text-purple-700">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span>Generating menu...</span>
                </div>
              )}
            </div>

            {isGeneratingMenu && (
              <div className="mb-6">
                <Progress value={50} className="h-2 bg-purple-100" />
                <p className="text-sm text-center mt-1 text-gray-500">
                  Please wait while we create your perfect menu
                </p>
              </div>
            )}
            
            <AnimatePresence>
              {courses.length > 0 ? (
                <Reorder.Group 
                  axis="y" 
                  values={courses} 
                  onReorder={menuPlanningComplete ? undefined : reorderCourses}
                  className="space-y-4"
                >
                  {courses.map((course) => (
                    <Reorder.Item
                      key={course.id}
                      value={course}
                      className={`flex flex-col p-4 glass rounded-lg ${menuPlanningComplete ? 'cursor-default' : 'cursor-move'} bg-white transition-colors ${course.recipe ? 'bg-purple-50/50' : ''}`}
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
                              ref={editingInputRef}
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
                          <span 
                            className={`flex-grow font-medium ${!menuPlanningComplete ? 'hover:text-purple-600 cursor-pointer' : ''}`}
                            onClick={() => !menuPlanningComplete && startEditing(course)}
                          >
                            {course.title}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          {course.recipe && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setOpenRecipe(openRecipe === course.id ? null : course.id)}
                              className={`transition-colors ${openRecipe === course.id ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          )}
                          {!menuPlanningComplete && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleGenerateRecipe(course.id)}
                                disabled={isGeneratingRecipe !== null || networkStatus === 'offline'}
                                className={`relative ${
                                  course.recipe 
                                    ? 'text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300' 
                                    : ''
                                } ${
                                  isGeneratingRecipe === course.id 
                                    ? 'bg-purple-50' 
                                    : ''
                                }`}
                              >
                                {isGeneratingRecipe === course.id ? (
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
                                disabled={isGeneratingRecipe === course.id}
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
                          className="mt-4 pt-4 border-t"
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
                  ))}
                </Reorder.Group>
              ) : !isGeneratingMenu && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
                >
                  <p className="text-gray-500">
                    {name 
                      ? `Enter a name and click the wand button to generate a menu, or add courses manually.` 
                      : `Enter a name for your menu to get started.`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!menuPlanningComplete && (
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

      {/* Error dialog */}
      <Dialog open={showErrorDialog} onOpenChange={(open) => {
        setShowErrorDialog(open);
        if (!open) clearGenerateError();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 gap-2">
              <AlertCircle className="h-5 w-5" />
              Generation Error
            </DialogTitle>
            <DialogDescription>
              There was an error during the generation process:
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {generateError}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            <p>Possible solutions:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Check your internet connection</li>
              <li>Try again in a few minutes</li>
              <li>Try with a different menu name</li>
              <li>Refresh the page and try again</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
