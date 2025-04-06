import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  menuGenerated: boolean;
  originalMenuName: string;
  isGeneratingFullMenu: boolean;
  isLoadingRecipe: boolean;
  lastError: string | null;
  isLoadingRecipeFor: string | null;
  authChecked: boolean;
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
  loadRecipeForCourse: (courseId: string) => Promise<void>;
  reset: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  name: '',
  courses: [],
  guestCount: 1,
  prepDays: 1,
  courseCount: 3,
  menuId: null,
  menuPlanningComplete: false,
  menuGenerated: false,
  originalMenuName: '',
  isGeneratingFullMenu: false,
  isLoadingRecipe: false,
  lastError: null,
  isLoadingRecipeFor: null,
  authChecked: false,
  setName: async (name) => {
    set({ name });
    try {
      await get().saveMenu();
    } catch (error) {
      console.error('Failed to save menu name:', error);
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
  checkAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!session?.user;
    set({ authChecked: true });
    return isAuthenticated;
  },
  loadRecipeForCourse: async (courseId: string) => {
    const { courses } = get();
    const course = courses.find((c) => c.id === courseId);
    
    if (!course || !course.dbId) {
      console.error('Cannot load recipe, course not found or has no dbId:', courseId);
      toast({
        title: "Error Loading Recipe",
        description: "Course not found or has no database ID. Try saving the menu first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      set({ isLoadingRecipe: true, isLoadingRecipeFor: courseId, lastError: null });
      
      console.log('Loading recipe for course:', course.title, 'dbId:', course.dbId);
      
      const { data: recipe, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('course_id', course.dbId)
        .maybeSingle();
        
      if (error) {
        console.error('Error loading recipe:', error);
        set({ lastError: error.message, isLoadingRecipe: false, isLoadingRecipeFor: null });
        toast({
          title: "Recipe Load Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (!recipe) {
        console.log('No recipe found for course:', course.title);
        toast({
          title: "No Recipe Found",
          description: `No recipe exists for "${course.title}". Try generating one.`,
          variant: "default",
        });
        set({ isLoadingRecipe: false, isLoadingRecipeFor: null });
        return;
      }
      
      console.log('Recipe loaded successfully:', recipe);
      
      set((state) => ({
        courses: state.courses.map((c) => 
          c.id === courseId ? { ...c, recipe } : c
        ),
        isLoadingRecipe: false,
        isLoadingRecipeFor: null
      }));
      
      toast({
        title: "Recipe Loaded",
        description: `Successfully loaded recipe for "${course.title}"`,
      });
      
    } catch (error: any) {
      console.error('Failed to load recipe:', error);
      set({ lastError: error.message, isLoadingRecipe: false, isLoadingRecipeFor: null });
      toast({
        title: "Recipe Load Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  },
  generateRecipe: async (courseId: string, requirements?: string) => {
    const { courses, guestCount, menuId, checkAuth } = get();
    const course = courses.find((c) => c.id === courseId);
    
    if (!course) {
      toast({
        title: "Error",
        description: "Course not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const isAuthenticated = await checkAuth();
      
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to generate recipes",
          variant: "destructive",
        });
        return;
      }

      set({ isLoadingRecipe: true, isLoadingRecipeFor: courseId, lastError: null });
      
      console.log('Starting recipe generation for:', course.title);
      
      if (!menuId) {
        console.log('No menu ID, saving menu first');
        await get().saveMenu();
      }

      const currentState = get();
      const updatedCourse = currentState.courses.find((c) => c.id === courseId);
      
      if (!currentState.menuId) {
        console.error('Failed to save menu. Please try again.');
        toast({
          title: "Error",
          description: "Failed to save menu. Please try again.",
          variant: "destructive",
        });
        set({ isLoadingRecipe: false, isLoadingRecipeFor: null, lastError: 'Failed to save menu' });
        return;
      }

      if (!updatedCourse?.dbId) {
        console.log('Course has no dbId, saving menu again to get dbId');
        await get().saveMenu();
        const retryState = get();
        const retryCourse = retryState.courses.find((c) => c.id === courseId);
        
        if (!retryCourse?.dbId) {
          console.error('Failed to save course. Please try again.');
          toast({
            title: "Error",
            description: "Failed to save course. Please try again.",
            variant: "destructive",
          });
          set({ isLoadingRecipe: false, isLoadingRecipeFor: null, lastError: 'Failed to save course' });
          return;
        }
      }

      const finalCourse = get().courses.find((c) => c.id === courseId);
      if (!finalCourse?.dbId) {
        console.error('Failed to save course. Please try again.');
        toast({
          title: "Error",
          description: "Failed to save course. Please try again.",
          variant: "destructive",
        });
        set({ isLoadingRecipe: false, isLoadingRecipeFor: null, lastError: 'Failed to save course' });
        return;
      }

      console.log('Calling generate-recipe edge function with:', {
        courseTitle: finalCourse.title,
        courseId: finalCourse.dbId,
        guestCount
      });

      try {
        const response = await supabase.functions.invoke('generate-recipe', {
          body: {
            courseTitle: finalCourse.title,
            guestCount,
            requirements,
          },
        });
  
        console.log('Edge function response:', response);
  
        if (response.error) {
          console.error('Recipe generation error:', response.error);
          set({ isLoadingRecipe: false, isLoadingRecipeFor: null, lastError: response.error.message });
          throw new Error(response.error.message || 'Failed to generate recipe');
        }
  
        if (!response.data) {
          set({ isLoadingRecipe: false, isLoadingRecipeFor: null, lastError: 'No recipe data received' });
          throw new Error('No recipe data received');
        }
  
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        const recipe: Recipe = {
          course_id: finalCourse.dbId,
          created_by: userId,
          ...response.data,
        };
  
        console.log('Saving recipe to database:', recipe);
  
        const { data: savedRecipe, error: saveError } = await supabase
          .from('recipes')
          .insert(recipe)
          .select()
          .single();
  
        if (saveError) {
          console.error('Recipe save error:', saveError);
          set({ isLoadingRecipe: false, isLoadingRecipeFor: null, lastError: saveError.message });
          throw new Error('Failed to save recipe');
        }
  
        console.log('Recipe saved successfully:', savedRecipe);
  
        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === courseId ? { ...c, recipe: savedRecipe } : c
          ),
          isLoadingRecipe: false,
          isLoadingRecipeFor: null,
          lastError: null
        }));
  
        toast({
          title: "Success",
          description: "Recipe generated successfully!",
        });
      } catch (error: any) {
        console.error('Edge function call failed:', error);
        set({ 
          isLoadingRecipe: false, 
          isLoadingRecipeFor: null, 
          lastError: `Edge function error: ${error.message || 'Unknown error'}`
        });
        throw new Error(`Edge function error: ${error.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Recipe generation error:', error);
      toast({
        title: "Recipe Generation Failed",
        description: error.message || 'Failed to generate recipe',
        variant: "destructive",
      });
      set({ isLoadingRecipe: false, isLoadingRecipeFor: null, lastError: error.message });
      throw error;
    }
  },
  generateMenu: async (prompt: string) => {
    const { menuId, saveMenu, addCourse, name, guestCount, courseCount } = get();
    
    if (!menuId) {
      console.log('No menu ID, saving menu first');
      await saveMenu();
    }

    console.log('Generating menu with:', { name, guestCount, courseCount });
    
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
    
    console.log('Calling generate-recipe edge function for menu generation');

    const response = await supabase.functions.invoke('generate-recipe', {
      body: {
        generateMenu: true,
        generateRecipes: true,
        prompt: menuThemePrompt,
        menuName: name,
        guestCount: guestCount,
        courseCount: courseCount
      },
    });

    console.log('Menu generation response:', response);

    if (response.error) {
      console.error('Menu generation error:', response.error);
      set({ isGeneratingFullMenu: false, lastError: response.error.message });
      throw new Error(response.error.message || 'Failed to generate menu');
    }

    if (!response.data?.courses || !Array.isArray(response.data.courses)) {
      set({ isGeneratingFullMenu: false, lastError: 'No menu data received' });
      throw new Error('No menu data received');
    }

    set({ courses: [] });

    const coursesWithRecipes = response.data.courses;
    const recipePromises: Promise<void>[] = [];

    console.log('Adding courses to store:', coursesWithRecipes);
    coursesWithRecipes.forEach((courseData: any) => {
      addCourse({
        title: courseData.title,
        order: get().courses.length,
      });
    });
    
    console.log('Saving menu to get database IDs for courses');
    await get().saveMenu();
    
    const currentState = get();
    const currentCourses = currentState.courses;

    console.log('Current courses after save:', currentCourses);

    for (let i = 0; i < currentCourses.length; i++) {
      const course = currentCourses[i];
      const courseData = coursesWithRecipes[i];
      
      if (courseData.recipe) {
        try {
          console.log(`Generating recipe for ${course.title}`);
          await get().generateRecipe(course.id);
        } catch (error) {
          console.error(`Failed to generate recipe for ${course.title}:`, error);
          // Continue with other recipes even if one fails
        }
      }
    }

    set({ 
      menuGenerated: true,
      originalMenuName: name,
      isGeneratingFullMenu: false,
      lastError: null
    });

    toast({
      title: "Success",
      description: "Menu and recipes generated successfully!",
      variant: "default",
    });
  },
  saveMenu: async () => {
    const { name, guestCount, prepDays, courses, menuId } = get();
    
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to save a menu",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let currentMenuId = menuId;
      const menuName = name.trim() || 'Untitled';
      
      console.log('Saving menu:', { menuName, guestCount, prepDays, userId, courses });
      
      if (!currentMenuId) {
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

        if (menuError) {
          console.error('Menu creation error:', menuError);
          throw menuError;
        }
        currentMenuId = menu.id;
        console.log('Created new menu with ID:', currentMenuId);
        set({ menuId: currentMenuId });
      } else {
        console.log('Updating existing menu with ID:', currentMenuId);
        const { error: updateError } = await supabase
          .from('menus')
          .update({
            name: menuName,
            guest_count: guestCount,
            prep_days: prepDays
          })
          .eq('id', currentMenuId);

        if (updateError) {
          console.error('Menu update error:', updateError);
          throw updateError;
        }
      }

      console.log('Deleting old courses for menu ID:', currentMenuId);
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('menu_id', currentMenuId);

      if (deleteError) {
        console.error('Courses deletion error:', deleteError);
        throw deleteError;
      }

      console.log('Saving courses for menu ID:', currentMenuId);
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

      if (coursesError) {
        console.error('Courses creation error:', coursesError);
        throw coursesError;
      }

      if (savedCourses) {
        console.log('Saved courses with IDs:', savedCourses.map(c => c.id));
        set((state) => ({
          courses: state.courses.map((course, index) => ({
            ...course,
            dbId: savedCourses[index].id,
          })),
        }));
      }
    } catch (error: any) {
      console.error('Menu save error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to save menu',
        variant: "destructive",
      });
      throw error;
    }
  },
  reset: () => set({
    name: '',
    courses: [],
    guestCount: 1,
    prepDays: 1,
    courseCount: 3,
    menuId: null,
    menuPlanningComplete: false,
    menuGenerated: false,
    originalMenuName: '',
    isGeneratingFullMenu: false,
    isLoadingRecipe: false,
    lastError: null,
    isLoadingRecipeFor: null,
    authChecked: false,
  }),
}));
