import { useState, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import { Pencil, Check, AlertTriangle, Loader2, Plus } from "lucide-react";
import { useMenuStore } from "@/store/menuStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { MenuConfiguration } from "@/components/menu/MenuConfiguration";
import { MenuActions } from "@/components/menu/MenuActions";
import { CourseItem } from "@/components/menu/CourseItem";
import { MenuDocument } from "@/components/menu/MenuDocument";
import { CookingView } from "@/components/menu/CookingView";
import { Course, CourseType } from "@/types/database.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
    updateCourseType,
    setParentCourse,
    getMainCourses,
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
  const [cookingViewCourse, setCookingViewCourse] = useState<Course | null>(null);
  const [newCourseType, setNewCourseType] = useState<CourseType>("main");
  const mainCourses = getMainCourses();

  const hasConfigChanged = !menuPlanningComplete && 
    menuGenerated && 
    originalConfig && 
    courses.length > 0 && 
    (
      guestCount !== originalConfig.guestCount ||
      prepDays !== originalConfig.prepDays ||
      courseCount !== originalConfig.courseCount ||
      name !== originalMenuName
    ) && (
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
      }).catch(error => {
        console.error('Error loading menu:', error);
        toast.error('Failed to load menu');
      });
    }
  }, [id, loadMenu]);

  if (isLoadingMenu) {
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
      courseType: newCourseType,
    });
    setNewCourseTitle("");
    toast.success("Course added successfully");
  };

  const handleUpdateCourseType = (courseId: string, courseType: CourseType) => {
    updateCourseType(courseId, courseType);
    if (courseType !== 'side') {
      setParentCourse(courseId, null);
    }
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentType}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              @page { margin: 1.5cm; }
              body { 
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.4;
                margin: 0;
                padding: 0;
              }
              h1 { font-size: 1.5em; margin: 0 0 1em 0; font-weight: 600; }
              h2 { font-size: 1.3em; margin: 1em 0 0.5em 0; font-weight: 600; }
              h3 { font-size: 1.1em; margin: 1em 0 0.5em 0; font-weight: 600; }
              p { margin: 0.5em 0; }
              ul, ol { margin: 0.5em 0; padding-left: 2em; }
              ul { list-style-type: disc; }
              ol { list-style-type: decimal; }
              li { margin: 0.25em 0; }
              em, i { font-style: italic; }
              strong, b { font-weight: 600; }
              hr { margin: 1em 0; border: none; border-top: 1px solid #000; }
            }
            body {
              padding: 1.5cm;
              max-width: 21cm;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <h1>${documentType}</h1>
          <div class="markdown-content"></div>
          <script>
            document.querySelector('.markdown-content').innerHTML = ${JSON.stringify(content)};
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
  };

  const handleOpenCookingView = (course: Course) => {
    setCookingViewCourse(course);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        {cookingViewCourse && (
          <CookingView 
            course={cookingViewCourse} 
            open={!!cookingViewCourse} 
            onClose={() => setCookingViewCourse(null)} 
          />
        )}

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
          
          <MenuConfiguration
            name={name}
            guestCount={guestCount}
            desiredCourseCount={desiredCourseCount}
            prepDays={prepDays}
            menuPlanningComplete={menuPlanningComplete}
            onNameChange={setName}
            onGuestCountChange={setGuestCount}
            onDesiredCourseCountChange={setDesiredCourseCount}
            onPrepDaysChange={setPrepDays}
          />

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

          {!menuPlanningComplete && (
            <MenuActions
              name={name}
              generatingMenu={generatingMenu}
              showRegenerationConfirmation={showRegenerationConfirmation}
              onGenerateMenu={handleGenerateMenu}
            />
          )}

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Courses</h2>
            
            <Reorder.Group 
              axis="y" 
              values={courses} 
              onReorder={menuPlanningComplete ? undefined : reorderCourses}
              className="space-y-4"
            >
              {courses.map((course) => (
                <CourseItem
                  key={course.id}
                  course={course}
                  isEditing={editingCourseId === course.id}
                  generatingFor={generatingFor}
                  generatingRecipeForCourse={generatingRecipeForCourse}
                  menuPlanningComplete={menuPlanningComplete}
                  onStartEditing={(course) => {
                    setEditingCourseId(course.id);
                    setEditingTitle(course.title);
                  }}
                  onSaveEditing={() => {
                    if (editingCourseId && editingTitle.trim()) {
                      updateCourse(editingCourseId, { title: editingTitle.trim() });
                      setEditingCourseId(null);
                      setEditingTitle("");
                      toast.success("Course title updated");
                    }
                  }}
                  onCancelEditing={() => {
                    setEditingCourseId(null);
                    setEditingTitle("");
                  }}
                  onGenerateRecipe={handleGenerateRecipe}
                  onRemoveCourse={removeCourse}
                  editingTitle={editingTitle}
                  onEditingTitleChange={(value) => setEditingTitle(value)}
                  openRecipe={openRecipe}
                  onToggleRecipe={setOpenRecipe}
                  onOpenCookingView={handleOpenCookingView}
                  onChangeCourseType={handleUpdateCourseType}
                  onSetParentCourse={setParentCourse}
                  availableMainCourses={mainCourses}
                />
              ))}
            </Reorder.Group>

            {!menuPlanningComplete && (
              <div className="flex flex-col space-y-2">
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
                  <Select
                    value={newCourseType}
                    onValueChange={(value) => setNewCourseType(value as CourseType)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="main">Main</SelectItem>
                      <SelectItem value="side">Side</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddCourse}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                </div>
                {newCourseType === 'side' && mainCourses.length > 0 && (
                  <div className="flex items-center ml-4 text-sm text-gray-500">
                    <span>
                      Note: After adding a side dish, you can associate it with a main course by editing it.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

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
              <MenuDocument
                title="Recipes"
                content={menuDocuments.recipes}
                isOpen={openRecipe === 'recipes'}
                isGenerating={isGeneratingDocuments}
                onToggle={() => setOpenRecipe(openRecipe === 'recipes' ? null : 'recipes')}
                onPrint={(content) => handlePrintDocument('Recipes', content)}
              />

              <MenuDocument
                title="Mise en Place"
                content={menuDocuments.mise_en_place}
                isOpen={openRecipe === 'mise_en_place'}
                isGenerating={isGeneratingDocuments}
                onToggle={() => setOpenRecipe(openRecipe === 'mise_en_place' ? null : 'mise_en_place')}
                onPrint={(content) => handlePrintDocument('Mise en Place', content)}
              />

              <MenuDocument
                title="Service Instructions"
                content={menuDocuments.service_instructions}
                isOpen={openRecipe === 'service_instructions'}
                isGenerating={isGeneratingDocuments}
                onToggle={() => setOpenRecipe(openRecipe === 'service_instructions' ? null : 'service_instructions')}
                onPrint={(content) => handlePrintDocument('Service Instructions', content)}
              />

              <MenuDocument
                title="Shopping List"
                content={menuDocuments.shopping_list}
                isOpen={openRecipe === 'shopping_list'}
                isGenerating={isGeneratingDocuments}
                onToggle={() => setOpenRecipe(openRecipe === 'shopping_list' ? null : 'shopping_list')}
                onPrint={(content) => handlePrintDocument('Shopping List', content)}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MenuPage;
