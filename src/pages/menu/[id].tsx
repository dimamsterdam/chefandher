import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useMenuStore } from "@/store/menuStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCheck, Copy, Plus, Save, Trash2, ChefHat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils";
import { generate } from "lucide-react";
import { Course } from "@/components/Course";

const MenuPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    name,
    setName,
    courses,
    guestCount,
    prepDays,
    menuId,
    loadMenu,
    addCourse,
    removeCourse,
    updateCourse,
    reorderCourses,
    generateRecipe,
    saveMenu,
    menuPlanningComplete,
    setMenuPlanningComplete,
    reset,
    generateMenuDocuments,
    isGeneratingDocuments,
    menuDocuments,
    hasUnsavedChanges,
    originalMenuName,
    generateMenu,
    isLoadingMenu,
    deleteMenu,
    confirmMenuRegeneration,
    cancelMenuRegeneration,
    showRegenerationConfirmation,
    setGuestCount,
    setPrepDays,
    setCourseCount,
  } = useMenuStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const menuNameInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    if (searchParams.get('focus') === 'name' && menuNameInputRef.current) {
      menuNameInputRef.current.focus();
      menuNameInputRef.current.select();
    }
  }, [searchParams]);

  useEffect(() => {
    if (id === 'new') {
      reset();
      navigate(`/menu/${menuId || 'new'}`, { replace: true });
    } else if (id) {
      loadMenu(id);
    }

    return () => reset();
  }, [id, loadMenu, reset, navigate, menuId]);

  const handleSaveMenu = async () => {
    setIsSaving(true);
    try {
      await saveMenu();
      toast.success('Menu saved successfully!');
    } catch (error) {
      console.error('Failed to save menu:', error);
      toast.error('Failed to save menu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDocuments = async () => {
    setIsGenerating(true);
    try {
      await generateMenuDocuments();
      toast.success('Menu documents generated successfully!');
    } catch (error) {
      console.error('Failed to generate menu documents:', error);
      toast.error('Failed to generate menu documents');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyContent = (documentType: keyof typeof menuDocuments) => {
    const content = menuDocuments[documentType];
    if (content) {
      navigator.clipboard.writeText(content)
        .then(() => {
          setIsCopying(true);
          toast.success(`${documentType} copied to clipboard!`);
          setTimeout(() => setIsCopying(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          toast.error(`Failed to copy ${documentType} to clipboard`);
        });
    } else {
      toast.error(`No ${documentType} available to copy`);
    }
  };

  const handleDeleteMenu = async () => {
    setIsDeleting(true);
    try {
      if (menuId) {
        await deleteMenu(menuId);
        navigate("/");
      } else {
        toast.error('No menu to delete');
      }
    } catch (error) {
      console.error('Failed to delete menu:', error);
      toast.error('Failed to delete menu');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateMenu = async (prompt: string, guestCount: number, courseCount: number, withRecipes: boolean = false) => {
    try {
      await generateMenu(prompt, guestCount, courseCount, withRecipes);
    } catch (error) {
      console.error('Menu generation failed:', error);
      toast.error('Menu generation failed');
    }
  };

  const handleRegenerateMenu = useCallback(() => {
    if (originalMenuName) {
      handleGenerateMenu(originalMenuName, guestCount, courses.length);
    }
  }, [guestCount, courses.length, originalMenuName, handleGenerateMenu]);

  if (isLoadingMenu) {
    return <div className="flex items-center justify-center h-screen">Loading menu...</div>;
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <input
        ref={menuNameInputRef}
        type="text"
        placeholder="Untitled Menu"
        className="text-2xl font-semibold tracking-tight text-foreground bg-transparent border-none hover:bg-accent/50 rounded-md px-2 py-1 transition-colors"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex items-center space-x-4">
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Guest Count</CardTitle>
            <CardDescription>Number of guests expected</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
            />
          </CardContent>
        </Card>

        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Prep Days</CardTitle>
            <CardDescription>Number of days for preparation</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min="1"
              value={prepDays}
              onChange={(e) => setPrepDays(Number(e.target.value))}
            />
          </CardContent>
        </Card>

        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Course Count</CardTitle>
            <CardDescription>Number of courses in the menu</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min="1"
              value={courses.length}
              onChange={(e) => setCourseCount(Number(e.target.value))}
              disabled
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Courses</h2>
        <Button onClick={() => addCourse({ title: `Course ${courses.length + 1}`, order: courses.length })}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      <div className="space-y-4">
        {courses.map((course, index) => (
          <Course
            key={course.id}
            course={course}
            onRemove={() => removeCourse(course.id)}
            onUpdate={(updates) => updateCourse(course.id, updates)}
            onGenerateRecipe={(requirements) => generateRecipe(course.id, requirements)}
          />
        ))}
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Menu Planning</h2>
        <Label htmlFor="menu-planning-complete" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
          Planning Complete
        </Label>
        <Switch
          id="menu-planning-complete"
          checked={menuPlanningComplete}
          onCheckedChange={(checked) => setMenuPlanningComplete(checked)}
        />
      </div>

      {menuPlanningComplete && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mise en Place</CardTitle>
              <CardDescription>Detailed preparation instructions</CardDescription>
            </CardHeader>
            <CardContent>
              {menuDocuments.mise_en_place ? (
                <div className="space-y-2">
                  <Textarea
                    readOnly
                    value={menuDocuments.mise_en_place}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleCopyContent('mise_en_place')}
                    disabled={isCopying}
                  >
                    {isCopying ? <CheckCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy to Clipboard
                  </Button>
                </div>
              ) : (
                <p>No mise en place available. Generate documents to create one.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Instructions</CardTitle>
              <CardDescription>Instructions for serving the menu</CardDescription>
            </CardHeader>
            <CardContent>
              {menuDocuments.service_instructions ? (
                <div className="space-y-2">
                  <Textarea
                    readOnly
                    value={menuDocuments.service_instructions}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleCopyContent('service_instructions')}
                    disabled={isCopying}
                  >
                    {isCopying ? <CheckCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy to Clipboard
                  </Button>
                </div>
              ) : (
                <p>No service instructions available. Generate documents to create one.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shopping List</CardTitle>
              <CardDescription>List of ingredients needed for the menu</CardDescription>
            </CardHeader>
            <CardContent>
              {menuDocuments.shopping_list ? (
                <div className="space-y-2">
                  <Textarea
                    readOnly
                    value={menuDocuments.shopping_list}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleCopyContent('shopping_list')}
                    disabled={isCopying}
                  >
                    {isCopying ? <CheckCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy to Clipboard
                  </Button>
                </div>
              ) : (
                <p>No shopping list available. Generate documents to create one.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipes</CardTitle>
              <CardDescription>Detailed recipes for each course</CardDescription>
            </CardHeader>
            <CardContent>
              {menuDocuments.recipes ? (
                <div className="space-y-2">
                  <Textarea
                    readOnly
                    value={menuDocuments.recipes}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleCopyContent('recipes')}
                    disabled={isCopying}
                  >
                    {isCopying ? <CheckCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy to Clipboard
                  </Button>
                </div>
              ) : (
                <p>No recipes available. Generate documents to create them.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={handleGenerateDocuments}
          disabled={!menuPlanningComplete || isGeneratingDocuments}
        >
          {isGeneratingDocuments ? "Generating..." : "Generate Documents"}
        </Button>
        <Button
          onClick={handleSaveMenu}
          disabled={!hasUnsavedChanges || isSaving}
        >
          {isSaving ? "Saving..." : "Save Menu"}
        </Button>
      </div>

      <Dialog open={showRegenerationConfirmation} onOpenChange={() => cancelMenuRegeneration()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Menu Regeneration</DialogTitle>
            <DialogDescription>
              Regenerating the menu will clear all existing courses and recipes. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => cancelMenuRegeneration()}>Cancel</Button>
            <Button variant="primary" onClick={() => confirmMenuRegeneration()}>Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuPage;
