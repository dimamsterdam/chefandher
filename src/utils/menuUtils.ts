
import { supabase } from '@/integrations/supabase/client';
import { Course, Recipe, MenuState } from '@/types/menu.types';
import { toast } from 'sonner';

const MAX_RETRIES = 3;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(
  operation: () => Promise<T>, 
  maxRetries: number = MAX_RETRIES,
  retryMessage: string = 'Retrying operation...'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffTime = Math.min(2 ** attempt * 300, 3000);
        console.log(`Attempt ${attempt}/${maxRetries}: ${retryMessage} (waiting ${backoffTime}ms)`);
        await delay(backoffTime);
      }
      
      return await operation();
    } catch (error) {
      console.error(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  throw lastError;
}

export async function generateRecipeForCourse(courseId: string, requirements: string | undefined, guestCount: number, menuId: string | null, courses: Course[]) {
  const course = courses.find((c) => c.id === courseId);
    
  if (!course) {
    toast.error('Course not found');
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    toast.error("You must be logged in to generate recipes");
    return null;
  }

  if (!menuId) {
    throw new Error('Menu must be saved before generating recipes');
  }

  if (!course.dbId) {
    throw new Error('Course must be saved before generating recipes');
  }

  const response = await supabase.functions.invoke('generate-recipe', {
    body: {
      courseTitle: course.title,
      guestCount,
      requirements,
    },
  });

  if (response.error) {
    console.error('Recipe generation error:', response.error);
    throw new Error(response.error.message || 'Failed to generate recipe');
  }

  if (!response.data) {
    throw new Error('No recipe data received');
  }

  const recipe: Recipe = {
    course_id: course.dbId,
    created_by: userId,
    title: response.data.title,
    ingredients: response.data.ingredients,
    instructions: response.data.instructions,
    prep_time_minutes: response.data.prep_time_minutes,
    cook_time_minutes: response.data.cook_time_minutes,
    servings: response.data.servings
  };

  const { error: updateCourseError } = await supabase
    .from('courses')
    .update({ description: response.data.description })
    .eq('id', course.dbId);

  if (updateCourseError) {
    throw new Error('Failed to update course description');
  }

  const { data: savedRecipe, error: saveError } = await supabase
    .from('recipes')
    .insert(recipe)
    .select()
    .single();

  if (saveError) {
    throw new Error('Failed to save recipe');
  }

  return {
    savedRecipe,
    description: response.data.description
  };
}
