import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Course } from "@/types/database.types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CookingViewProps {
  course: Course;
  open: boolean;
  onClose: () => void;
}

export const CookingView = ({ course, open, onClose }: CookingViewProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const isMobile = useIsMobile();
  const recipe = course.recipe;
  
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open, course.id]);

  if (!recipe) return null;

  const steps = [
    { type: 'title', content: recipe.title },
    { type: 'ingredients', content: recipe.ingredients },
    ...recipe.instructions.map(instruction => ({
      type: 'instruction',
      content: instruction.replace(/^Step \d+:\s*/i, '')
    }))
  ];

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    if (step.type === 'title') {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">{step.content}</h1>
          <p className="text-2xl text-gray-600 text-center">Recipe for {course.title}</p>
          <div className="mt-6 text-xl text-gray-500">
            <p><span className="font-medium">Prep Time:</span> {recipe.prep_time_minutes} min</p>
            <p><span className="font-medium">Cook Time:</span> {recipe.cook_time_minutes} min</p>
          </div>
        </div>
      );
    }
    
    if (step.type === 'ingredients') {
      return (
        <div className="flex flex-col h-full">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ingredients</h2>
          <ul className="text-xl md:text-2xl space-y-4 list-disc pl-8">
            {recipe.ingredients.map((ingredient, idx) => (
              <li key={idx}>{ingredient}</li>
            ))}
          </ul>
        </div>
      );
    }
    
    const instructionStepNumber = steps.filter(s => s.type === 'instruction').findIndex(s => s === step) + 1;
    
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Step {instructionStepNumber}</h2>
        <p className="text-xl md:text-2xl">{step.content}</p>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[100dvh] w-full p-0 sm:max-w-full"
      >
        <div className="absolute inset-0 bg-white flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="text-center">
              <span className="font-medium">
                {currentStep + 1} of {steps.length}
              </span>
            </div>
            <div className="w-10"></div>
          </div>
          
          <div className="flex-1 overflow-hidden p-6">
            <ScrollArea className="h-full">
              <div className="flex items-center justify-center min-h-full">
                {renderStepContent()}
              </div>
            </ScrollArea>
          </div>
          
          <div className="p-4 border-t flex justify-between">
            <Button 
              onClick={goToPreviousStep} 
              disabled={currentStep === 0}
              size={isMobile ? "lg" : "default"}
              variant="outline"
              className="flex-1 mr-2 text-lg"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>
            <Button 
              onClick={goToNextStep} 
              disabled={currentStep === steps.length - 1}
              size={isMobile ? "lg" : "default"}
              className="flex-1 ml-2 text-lg"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
