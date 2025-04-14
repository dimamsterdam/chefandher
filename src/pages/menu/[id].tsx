import { useState, useRef, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import { Plus, Minus, Trash2, GripVertical, ChefHat, RefreshCw, Loader2, BookOpen, Check, X, Wand2, CheckCircle2, Printer, Pencil, AlertTriangle } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import ReactDOM from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParams } from "react-router-dom";

const MenuPage = () => {
  const { id } = useParams();
  console.log('MenuPage mounted with id:', id);
  
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
    generatingRecipeForCourse,
    menuDocuments,
    isGeneratingDocuments,
    showRegenerationConfirmation,
    pendingMenuGeneration,
    confirmMenuRegeneration,
    cancelMenuRegeneration,
    originalConfig,
    courseCount,
    loadMenu,
    isLoadingMenu
  } = useMenuStore();
  
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [generatingMenu, setGeneratingMenu] = useState(false);
  const [desiredCourseCount, setDesiredCourseCount] = useState(courses.length || 3);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);

  const shouldWandBeActive = !name.trim() || !menuGenerated || (menuGenerated && name !== originalMenuName);

  const hasConfigChanged = !menuPlanningComplete && // Only show in edit mode
    menuGenerated && 
    originalConfig && 
    courses.length > 0 && // Only show if we have existing courses
    (
      guestCount !== originalConfig.guestCount ||
      prepDays !== originalConfig.prepDays ||
      courseCount !== originalConfig.courseCount ||
      name !== originalMenuName
    ) && (
      // Don't show if this is the first generation
      originalConfig.guestCount !== 1 ||
      originalConfig.prepDays !== 1 ||
      originalConfig.courseCount !== 3 ||
      originalMenuName !== name
    );

  useEffect(() => {
    console.log('useEffect triggered with id:', id);
    if (id) {
      console.log('Loading menu with id:', id);
      loadMenu(id).then(() => {
        console.log('Menu loaded successfully');
        console.log('Current menu state:', {
          name,
          guestCount,
          prepDays,
          courses,
          menuPlanningComplete,
          menuGenerated,
          menuDocuments
        });
      }).catch(error => {
        console.error('Error loading menu:', error);
      });
    }
  }, [id, loadMenu]);

  console.log('Current loading state:', isLoadingMenu);
  console.log('Current menu data:', {
    name,
    guestCount,
    prepDays,
    courses,
    menuPlanningComplete,
    menuGenerated,
    menuDocuments
  });

  if (isLoadingMenu) {
    console.log('Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

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
      await generateRecipe(courseId, `Please adjust all ingredient quantities to serve ${guestCount} people.`);
      toast.success("Recipe generated successfully!");
    } catch (error) {
      console.error('Recipe generation failed:', error);
      toast.error('Failed to generate recipe. Please try again.');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleGenerateMenu = async (withRecipes: boolean) => {
    if (!name.trim()) {
      toast.error("Please enter a menu name first");
      return;
    }
    
    setGeneratingMenu(true);
    try {
      const prompt = `Create a complete ${name} menu for ${guestCount} guests with approximately ${desiredCourseCount} courses that specifically focuses on the theme of ${name}.`;
      await generateMenu(prompt, guestCount, desiredCourseCount, withRecipes);
      if (!showRegenerationConfirmation) {
        toast.success(withRecipes ? "Menu and recipes generated successfully!" : "Menu generated successfully!");
      }
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

  const handleToggleEditMode = () => {
    if (menuPlanningComplete) {
      setShowEditConfirmation(true);
    } else {
      handleCompleteMenuPlanning();
    }
  };

  const handleConfirmEditMode = () => {
    setMenuPlanningComplete(false);
    setShowEditConfirmation(false);
    toast.success("Returned to edit mode. Documents will be regenerated when completed.");
  };

  const handlePrintDocument = (documentType: string, content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Create a temporary div to render the markdown
    const tempDiv = document.createElement('div');
    const root = ReactDOM.createRoot(tempDiv);
    root.render(<ReactMarkdown>{content}</ReactMarkdown>);

    // Wait for React to finish rendering
    setTimeout(() => {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${documentType}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @media print {
                @page {
                  margin: 1.5cm;
                }
                body { 
                  font-family: system-ui, -apple-system, sans-serif;
                  line-height: 1.4;
                  margin: 0;
                  padding: 0;
                }
                h1 {
                  font-size: 1.5em;
                  margin: 0 0 1em 0;
                  font-weight: 600;
                }
                h2 {
                  font-size: 1.3em;
                  margin: 1em 0 0.5em 0;
                  font-weight: 600;
                }
                h3 {
                  font-size: 1.1em;
                  margin: 1em 0 0.5em 0;
                  font-weight: 600;
                }
                p {
                  margin: 0.5em 0;
                }
                ul, ol {
                  margin: 0.5em 0;
                  padding-left: 2em;
                }
                ul { list-style-type: disc; }
                ol { list-style-type: decimal; }
                li {
                  margin: 0.25em 0;
                }
                em, i {
                  font-style: italic;
                }
                strong, b {
                  font-weight: 600;
                }
                hr {
                  margin: 1em 0;
                  border: none;
                  border-top: 1px solid #000;
                }
              }
              /* Non-print styles for preview */
              body {
                padding: 1.5cm;
                max-width: 21cm;
                margin: 0 auto;
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.4;
              }
              h1 {
                font-size: 1.5em;
                margin: 0 0 1em 0;
                font-weight: 600;
              }
              h2 {
                font-size: 1.3em;
                margin: 1em 0 0.5em 0;
                font-weight: 600;
              }
              h3 {
                font-size: 1.1em;
                margin: 1em 0 0.5em 0;
                font-weight: 600;
              }
              p {
                margin: 0.5em 0;
              }
              ul, ol {
                margin: 0.5em 0;
                padding-left: 2em;
              }
              ul { list-style-type: disc; }
              ol { list-style-type: decimal; }
              li {
                margin: 0.25em 0;
              }
              em, i {
                font-style: italic;
              }
              strong, b {
                font-weight: 600;
              }
              hr {
                margin: 1em 0;
                border: none;
                border-top: 1px solid #000;
              }
            </style>
          </head>
          <body>
            <h1>${documentType}</h1>
            ${tempDiv.innerHTML}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Dialog open={showEditConfirmation} onOpenChange={setShowEditConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Confirm Return to Edit Mode
              </DialogTitle>
              <DialogDescription>
                Returning to edit mode will pause document generation. Any changes made will require regenerating the documents when marking the menu as complete again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEditConfirmation(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleConfirmEditMode}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                Return to Edit Mode
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRegenerationConfirmation} onOpenChange={cancelMenuRegeneration}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Confirm Menu Regeneration
              </DialogTitle>
              <DialogDescription>
                This will delete all existing courses and recipes. Are you sure you want to proceed?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={cancelMenuRegeneration}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={confirmMenuRegeneration}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                Regenerate Menu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-xl p-8 max-w-4xl mx-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Menu Planning</h1>
            <Button 
              onClick={handleToggleEditMode}
              variant={menuPlanningComplete ? "outline" : "default"}
              className={menuPlanningComplete ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : ""}
              disabled={courses.length === 0 || !name.trim() || generatingMenu}
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
          
          {/* Menu Details */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2">Menu Name</label>
              <div className="flex items-center space-x-2 max-w-md">
                {menuPlanningComplete ? (
                  <div className="text-lg font-medium">{name}</div>
                ) : (
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                        onClick={() => setDesiredCourseCount(Math.max(1, desiredCourseCount - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[3rem] text-center">{desiredCourseCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDesiredCourseCount(desiredCourseCount + 1)}
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Warning */}
          {hasConfigChanged && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">Configuration Changed</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    The menu configuration has changed. Consider regenerating the menu to ensure courses are appropriate for the new settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generate Menu Buttons */}
          {!menuPlanningComplete && (
            <div className="flex justify-center space-x-4 my-6">
              <Button
                onClick={() => handleGenerateMenu(true)}
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
                onClick={() => handleGenerateMenu(false)}
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
          )}

          {/* Courses */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Courses</h2>
            
            <Reorder.Group 
              axis="y" 
              values={courses} 
              onReorder={menuPlanningComplete ? undefined : reorderCourses}
              className="space-y-4"
            >
              {courses.map((course) => (
                <div key={course.id} className="flex flex-col">
                  <Reorder.Item
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
                        <div className="flex-grow">
                          <span 
                            className={`font-medium ${!menuPlanningComplete ? 'hover:text-purple-600 cursor-pointer' : ''}`}
                            onClick={() => !menuPlanningComplete && startEditing(course)}
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
                      exit={{ 
                        opacity: 0,
                        height: 0,
                        transition: {
                          duration: 0.15,
                          height: {
                            duration: 0.15,
                            ease: "easeIn"
                          },
                          opacity: {
                            duration: 0.1,
                            ease: "easeIn"
                          }
                        }
                      }}
                      transition={{ 
                        duration: 0.2,
                        height: {
                          duration: 0.2,
                          ease: "easeOut"
                        },
                        opacity: {
                          duration: 0.1,
                          ease: "easeOut"
                        }
                      }}
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
              ))}
            </Reorder.Group>

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

        {/* Menu Documents */}
        {menuPlanningComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-xl p-8 max-w-4xl mx-auto mt-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Menu Documents</h2>
              {isGeneratingDocuments && (
                <div className="flex items-center text-purple-600 text-sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Documents...
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Mise en Place */}
              <div className="flex flex-col p-4 glass rounded-lg bg-white transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Mise en Place</h3>
                  <div className="flex items-center gap-2">
                    {menuDocuments.mise_en_place && !isGeneratingDocuments && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintDocument('Mise en Place', menuDocuments.mise_en_place!)}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    )}
                    {(menuDocuments.mise_en_place === null || isGeneratingDocuments) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        className="text-purple-600"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenRecipe(openRecipe === 'mise_en_place' ? null : 'mise_en_place')}
                        className={`transition-colors ${openRecipe === 'mise_en_place' ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {openRecipe === 'mise_en_place' && menuDocuments.mise_en_place && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ 
                      opacity: 0,
                      height: 0,
                      transition: {
                        duration: 0.15,
                        height: {
                          duration: 0.15,
                          ease: "easeIn"
                        },
                        opacity: {
                          duration: 0.1,
                          ease: "easeIn"
                        }
                      }
                    }}
                    transition={{ 
                      duration: 0.2,
                      height: {
                        duration: 0.2,
                        ease: "easeOut"
                      },
                      opacity: {
                        duration: 0.1,
                        ease: "easeOut"
                      }
                    }}
                    className="mt-4 pt-4 border-t overflow-hidden"
                  >
                    <div className="prose max-w-none">
                      <ReactMarkdown>{menuDocuments.mise_en_place}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Service Instructions */}
              <div className="flex flex-col p-4 glass rounded-lg bg-white transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Service Instructions</h3>
                  <div className="flex items-center gap-2">
                    {menuDocuments.service_instructions && !isGeneratingDocuments && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintDocument('Service Instructions', menuDocuments.service_instructions!)}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    )}
                    {(menuDocuments.service_instructions === null || isGeneratingDocuments) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        className="text-purple-600"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenRecipe(openRecipe === 'service_instructions' ? null : 'service_instructions')}
                        className={`transition-colors ${openRecipe === 'service_instructions' ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {openRecipe === 'service_instructions' && menuDocuments.service_instructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ 
                      opacity: 0,
                      height: 0,
                      transition: {
                        duration: 0.15,
                        height: {
                          duration: 0.15,
                          ease: "easeIn"
                        },
                        opacity: {
                          duration: 0.1,
                          ease: "easeIn"
                        }
                      }
                    }}
                    transition={{ 
                      duration: 0.2,
                      height: {
                        duration: 0.2,
                        ease: "easeOut"
                      },
                      opacity: {
                        duration: 0.1,
                        ease: "easeOut"
                      }
                    }}
                    className="mt-4 pt-4 border-t overflow-hidden"
                  >
                    <div className="prose max-w-none">
                      <ReactMarkdown>{menuDocuments.service_instructions}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Shopping List */}
              <div className="flex flex-col p-4 glass rounded-lg bg-white transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Shopping List</h3>
                  <div className="flex items-center gap-2">
                    {menuDocuments.shopping_list && !isGeneratingDocuments && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintDocument('Shopping List', menuDocuments.shopping_list!)}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    )}
                    {(menuDocuments.shopping_list === null || isGeneratingDocuments) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        className="text-purple-600"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenRecipe(openRecipe === 'shopping_list' ? null : 'shopping_list')}
                        className={`transition-colors ${openRecipe === 'shopping_list' ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {openRecipe === 'shopping_list' && menuDocuments.shopping_list && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ 
                      opacity: 0,
                      height: 0,
                      transition: {
                        duration: 0.15,
                        height: {
                          duration: 0.15,
                          ease: "easeIn"
                        },
                        opacity: {
                          duration: 0.1,
                          ease: "easeIn"
                        }
                      }
                    }}
                    transition={{ 
                      duration: 0.2,
                      height: {
                        duration: 0.2,
                        ease: "easeOut"
                      },
                      opacity: {
                        duration: 0.1,
                        ease: "easeOut"
                      }
                    }}
                    className="mt-4 pt-4 border-t overflow-hidden"
                  >
                    <div className="prose max-w-none">
                      <ReactMarkdown>{menuDocuments.shopping_list}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MenuPage; 