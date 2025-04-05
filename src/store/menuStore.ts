import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recipe {
  id?: string;
  course_id: string;
  created_by?: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
}

interface Course {
  id: string;
  title: string;
  order: number;
  recipe?: Recipe;
  dbId?: string;
}

interface MenuState {
  name: string;
  guestCount: number;
  prepDays: number;
  courseCount: number; 
  courses: Course[];
  menuId: string | null;
  menuPlanningComplete: boolean;
  isGeneratingMenu: boolean;
  isGeneratingRecipe: string | null;
  generateError: string | null;
  isRetrying: boolean;
  retryCount: number;
  setName: (name: string) => void;
  setGuestCount: (count: number) => void;
  setPrepDays: (days: number) => void;
  setCourseCount: (count: number) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  reorderCourses: (courses: Course[]) => void;
  generateRecipe: (courseId: string, requirements?: string) => Promise<void>;
  generateMenu: (prompt: string) => Promise<void>;
  saveMenu: () => Promise<void>;
  setMenuPlanningComplete: (complete: boolean) => void;
  reset: () => void;
  clearGenerateError: () => void;
}

const MAX_RETRIES = 3;
const FUNCTION_TIMEOUT = 60000; // 60 seconds timeout
const SAVE_MENU_TIMEOUT = 15000; // 15 seconds timeout

// Helper function to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
    
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Generic retry function for API calls
async function retryOperation<T>(
  operation: () => Promise<T>, 
  maxRetries: number = MAX_RETRIES,
  retryDelay: number = 1000,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`${operationName}: Attempt ${attempt + 1} of ${maxRetries}`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`${operationName} failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 300;
        const delay = retryDelay * Math.pow(1.5, attempt) + jitter;
        console.log(`Retrying in ${Math.round(delay / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

export const useMenuStore = create<MenuState>((set, get) => ({
  name: '',
  courses: [],
  guestCount: 1,
  prepDays: 1,
  courseCount: 3,
  menuId: null,
  menuPlanningComplete: false,
  isGeneratingMenu: false,
  isGeneratingRecipe: null,
  generateError: null,
  isRetrying: false,
  retryCount: 0,
  
  clearGenerateError: () => set({ generateError: null }),
  
  setName: async (name) => {
    set({ name });
    try {
      await get().saveMenu();
    } catch (error) {
      console.error('Failed to save menu name:', error);
      // Don't show toast here as saveMenu already handles it
    }
  },
  
  setGuestCount: (count) => set({ guestCount: count }),
  setPrepDays: (days) => set({ prepDays: days }),
  setCourseCount: (count) => set({ courseCount: count }),
  
  addCourse: (course) =>
    set((state) => ({
      courses: [...state.courses, { ...course, id: crypto.randomUUID() }],
    })),
    
  removeCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((course) => course.id !== id),
    })),
    
  updateCourse: (id, updates) =>
    set((state) => ({
      courses: state.courses.map((course) =>
        course.id === id ? { ...course, ...updates } : course
      ),
    })),
    
  reorderCourses: (courses) => set({ courses }),
  
  setMenuPlanningComplete: (complete) => set({ menuPlanningComplete: complete }),
  
  generateRecipe: async (courseId: string, requirements?: string) => {
    const { courses, guestCount, menuId } = get();
    const course = courses.find((c) => c.id === courseId);
    
    if (!course) {
      toast.error('Course not found');
      return;
    }

    // Set the generating state
    set({ isGeneratingRecipe: courseId, generateError: null });

    try {
      // Verify user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      const userId = session?.user?.id;

      if (!userId) {
        toast.error('You must be logged in to generate recipes');
        set({ isGeneratingRecipe: null });
        return;
      }

      // Ensure we have a valid menuId
      if (!menuId) {
        await retryOperation(
          () => get().saveMenu(), 
          MAX_RETRIES, 
          1000, 
          'Save menu before recipe generation'
        );
      }

      const currentState = get();
      const updatedCourse = currentState.courses.find((c) => c.id === courseId);
      
      if (!currentState.menuId) {
        toast.error('Failed to save menu. Please try again.');
        set({ isGeneratingRecipe: null });
        return;
      }

      // Make sure course is properly saved with a dbId
      if (!updatedCourse?.dbId) {
        await retryOperation(
          () => get().saveMenu(),
          MAX_RETRIES,
          1000,
          'Save course before recipe generation'
        );
        
        const retryState = get();
        const retryCourse = retryState.courses.find((c) => c.id === courseId);
        
        if (!retryCourse?.dbId) {
          toast.error('Failed to save course. Please try again.');
          set({ isGeneratingRecipe: null });
          return;
        }
      }

      const finalCourse = get().courses.find((c) => c.id === courseId);
      if (!finalCourse?.dbId) {
        toast.error('Failed to save course. Please try again.');
        set({ isGeneratingRecipe: null });
        return;
      }

      const functionPromise = supabase.functions.invoke('generate-recipe', {
        body: {
          courseTitle: finalCourse.title,
          guestCount,
          requirements,
        }
      });

      // Add timeout to the function call
      const response = await withTimeout(
        functionPromise,
        FUNCTION_TIMEOUT,
        'Recipe generation timed out. Please try again later.'
      );

      if (response.error) {
        console.error('Recipe generation error:', response.error);
        throw new Error(response.error.message || 'Failed to generate recipe');
      }

      if (!response.data) {
        throw new Error('No recipe data received');
      }

      const recipe: Recipe = {
        course_id: finalCourse.dbId,
        created_by: userId,
        ...response.data,
      };

      // Save the recipe to the database
      const saveRecipeOperation = async () => {
        const { data: savedRecipe, error: saveError } = await supabase
          .from('recipes')
          .insert(recipe)
          .select()
          .single();

        if (saveError) {
          console.error('Recipe save error:', saveError);
          throw new Error(`Failed to save recipe: ${saveError.message}`);
        }

        return savedRecipe;
      };

      const savedRecipe = await retryOperation(
        saveRecipeOperation,
        MAX_RETRIES,
        1000,
        'Save recipe to database'
      );

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, recipe: savedRecipe } : c
        ),
        isGeneratingRecipe: null,
      }));

      toast.success('Recipe generated successfully!');
    } catch (error: any) {
      console.error('Recipe generation error:', error);
      toast.error(error.message || 'Failed to generate recipe');
      set({ 
        isGeneratingRecipe: null,
        generateError: error.message || 'Failed to generate recipe'
      });
      throw error;
    }
  },
  
  generateMenu: async (prompt: string) => {
    // First check if we're already generating a menu
    if (get().isGeneratingMenu) {
      toast.error('A menu is already being generated. Please wait.');
      return;
    }
    
    // Set the generating state
    set({ 
      isGeneratingMenu: true, 
      generateError: null,
      isRetrying: false,
      retryCount: 0
    });
    
    try {
      // Check for user session
      const sessionCheck = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw new Error(`Authentication error: ${error.message}`);
        return session?.user?.id;
      };
      
      let userId;
      try {
        userId = await retryOperation(sessionCheck, 3, 1000, 'Authentication check');
      } catch (error) {
        // If we can't get a session, check network connectivity
        if (!window.navigator.onLine) {
          throw new Error("You're offline. Please check your internet connection and try again.");
        }
        throw error;
      }
      
      if (!userId) {
        toast.error('You must be logged in to generate a menu');
        set({ isGeneratingMenu: false });
        return;
      }

      const { saveMenu, addCourse, name, guestCount, courseCount, reset } = get();
      
      // Clear existing courses before generating new menu
      reset();
      
      // Save the empty menu first to get a menuId
      await retryOperation(
        () => saveMenu(),
        MAX_RETRIES,
        1000,
        'Save empty menu before generation'
      );

      const menuThemePrompt = `Create a complete ${name} menu for ${guestCount} guests. 
      The menu should specifically focus on dishes appropriate for a ${name.toLowerCase()} theme.
      
      IMPORTANT: 
      - Use SPECIFIC dish names, not generic course types
      - Include exactly ${courseCount} dishes total
      - For example:
        - Instead of "Appetizer", use something like "Garlic Butter Prawns" or "Mushroom Arancini Balls"
        - Instead of "Main Course", use something like "Pan-seared Salmon with Lemon Butter" or "Braised Short Ribs"
        - Instead of "Dessert", use something like "Chocolate Soufflé" or "Caramel Panna Cotta"
      
      Each dish name should be descriptive and appetizing.`;

      const generateMenuOperation = async () => {
        // Check network connectivity before making the request
        if (!window.navigator.onLine) {
          throw new Error("You're offline. Please check your internet connection and try again.");
        }
        
        const functionPromise = supabase.functions.invoke('generate-recipe', {
          body: {
            generateMenu: true,
            prompt: menuThemePrompt,
            menuName: name,
            guestCount: guestCount,
            courseCount: courseCount
          }
        });
        
        // Add timeout to prevent hanging requests
        return withTimeout(
          functionPromise,
          FUNCTION_TIMEOUT,
          'Menu generation timed out. Please try again later.'
        );
      };

      let response;
      try {
        response = await retryOperation(
          generateMenuOperation,
          MAX_RETRIES,
          1500,
          'Menu generation'
        );
      } catch (error) {
        // If all retries fail, check network connectivity
        if (!window.navigator.onLine) {
          throw new Error("You're offline. Please check your internet connection and try again.");
        }
        throw error;
      }

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate menu');
      }

      if (!response.data?.courses || !Array.isArray(response.data.courses)) {
        throw new Error('Invalid menu data received');
      }

      // Add the generated courses
      response.data.courses.forEach((courseName: string, index: number) => {
        addCourse({
          title: courseName,
          order: index,
        });
      });

      // Save the menu with the new courses
      await retryOperation(
        () => saveMenu(),
        MAX_RETRIES,
        1000,
        'Save menu with generated courses'
      );

      toast.success('Menu generated successfully!');
    } catch (error: any) {
      console.error('Menu generation error:', error);
      toast.error(error.message || 'Failed to generate menu');
      set({
        generateError: error.message || 'Failed to generate menu'
      });
    } finally {
      // Always clear the generating state when done
      set({ isGeneratingMenu: false });
    }
  },
  
  saveMenu: async () => {
    const { name, guestCount, prepDays, courses, menuId } = get();
    
    try {
      // Check for user session
      const sessionCheck = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw new Error(`Authentication error: ${error.message}`);
        return session?.user?.id;
      };
      
      const userId = await retryOperation(sessionCheck, 2, 500, 'Authentication check for save');
      
      if (!userId) {
        toast.error('You must be logged in to save a menu');
        return;
      }
      
      // Use a timeout to prevent hanging requests
      let currentMenuId = menuId;
      const menuName = name.trim() || 'Untitled';
      
      // Create or update menu
      if (!currentMenuId) {
        // Create new menu
        const createMenuOperation = async () => {
          const { data: menu, error: menuError } = await supabase
            .from('menus')
            .insert({
              name: menuName,
              guest_count: guestCount,
              prep_days: prepDays,
              user_id: userId
            })
            .select()
            .single();

          if (menuError) throw menuError;
          return menu;
        };
        
        const menu = await withTimeout(
          retryOperation(createMenuOperation, 3, 1000, 'Create new menu'),
          SAVE_MENU_TIMEOUT,
          'Menu creation timed out. Please try again.'
        );
        
        currentMenuId = menu.id;
        set({ menuId: currentMenuId });
      } else {
        // Update existing menu
        const updateMenuOperation = async () => {
          const { error: updateError } = await supabase
            .from('menus')
            .update({
              name: menuName,
              guest_count: guestCount,
              prep_days: prepDays
            })
            .eq('id', currentMenuId);

          if (updateError) throw updateError;
        };
        
        await withTimeout(
          retryOperation(updateMenuOperation, 3, 1000, 'Update existing menu'),
          SAVE_MENU_TIMEOUT,
          'Menu update timed out. Please try again.'
        );
      }

      // Delete existing courses first
      const deleteCoursesOperation = async () => {
        const { error: deleteError } = await supabase
          .from('courses')
          .delete()
          .eq('menu_id', currentMenuId);

        if (deleteError) throw deleteError;
      };
      
      await withTimeout(
        retryOperation(deleteCoursesOperation, 2, 1000, 'Delete existing courses'),
        SAVE_MENU_TIMEOUT,
        'Deleting courses timed out. Please try again.'
      );

      // Only try to save courses if there are any
      if (courses.length > 0) {
        // Create new courses
        const saveCoursesOperation = async () => {
          const { data: savedCourses, error: coursesError } = await supabase
            .from('courses')
            .insert(
              courses.map((course) => ({
                menu_id: currentMenuId,
                title: course.title,
                order: course.order,
              }))
            )
            .select();

          if (coursesError) throw coursesError;
          return savedCourses;
        };
        
        const savedCourses = await withTimeout(
          retryOperation(saveCoursesOperation, 3, 1000, 'Save new courses'),
          SAVE_MENU_TIMEOUT,
          'Saving courses timed out. Please try again.'
        );

        // Update course IDs in the store
        if (savedCourses) {
          set((state) => ({
            courses: state.courses.map((course, index) => ({
              ...course,
              dbId: savedCourses[index]?.id || course.dbId,
            })),
          }));
        }
      }
    } catch (error: any) {
      console.error('Menu save error:', error);
      toast.error(error.message || 'Failed to save menu');
      throw error;
    }
  },
  
  reset: () => set((state) => ({
    name: state.name,
    courses: [],
    guestCount: state.guestCount,
    prepDays: state.prepDays,
    courseCount: state.courseCount,
    menuId: null,
    menuPlanningComplete: false,
    generateError: null,
  })),
}));
