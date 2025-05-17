import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/types/database.types';

type MenuDocument = Database['public']['Tables']['menu_documents']['Row'];
type DocumentType = Database['public']['Enums']['document_type'];

interface Menu {
  id: string;
  name: string;
  created_at: string;
  guest_count: number;
  prep_days: number;
  course_count: number;
}

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
  description?: string | null;
  recipe?: Recipe;
  dbId?: string;
}

interface MenuState {
  name: string;
  courses: Course[];
  guestCount: number;
  prepDays: number;
  courseCount: number;
  menuId: string | null;
  menuPlanningComplete: boolean;
  menuGenerated: boolean;
  originalMenuName: string;
  generatingRecipeForCourse: string | null;
  isGeneratingDocuments: boolean;
  menuDocuments: {
    mise_en_place: string | null;
    service_instructions: string | null;
    shopping_list: string | null;
    recipes: string | null;
  };
  hasUnsavedChanges: boolean;
  originalConfig: {
    guestCount: number;
    prepDays: number;
    courseCount: number;
  } | null;
  showRegenerationConfirmation: boolean;
  pendingMenuGeneration: {
    prompt: string;
    guestCount: number;
    courseCount: number;
    withRecipes: boolean;
  } | null;
  menus: Menu[];
  isLoadingMenus: boolean;
  isLoadingMenu: boolean;
  fetchMenus: () => Promise<void>;
  loadMenu: (menuId: string) => Promise<void>;
  setName: (name: string) => void;
  setGuestCount: (count: number) => void;
  setPrepDays: (days: number) => void;
  setCourseCount: (count: number) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  reorderCourses: (courses: Course[]) => void;
  generateRecipe: (courseId: string, requirements?: string) => Promise<void>;
  generateMenu: (prompt: string, guestCount: number, courseCount: number, withRecipes: boolean) => Promise<void>;
  _generateMenu: (prompt: string, guestCount: number, courseCount: number, withRecipes: boolean) => Promise<void>;
  saveMenu: () => Promise<void>;
  setMenuPlanningComplete: (complete: boolean) => void;
  reset: () => void;
  generateMenuDocuments: () => Promise<void>;
  confirmMenuRegeneration: () => Promise<void>;
  cancelMenuRegeneration: () => void;
  deleteMenu: (menuId: string) => Promise<void>;
  createNewMenu: () => Promise<string | null>;
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
  generatingRecipeForCourse: null,
  isGeneratingDocuments: false,
  menuDocuments: {
    mise_en_place: null,
    service_instructions: null,
    shopping_list: null,
    recipes: null
  },
  hasUnsavedChanges: false,
  originalConfig: null,
  showRegenerationConfirmation: false,
  pendingMenuGeneration: null,
  menus: [],
  isLoadingMenus: false,
  isLoadingMenu: false,
  fetchMenus: async () => {
    set({ isLoadingMenus: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ menus: [], isLoadingMenus: false });
        return;
      }

      const { data: menus, error } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ menus: menus || [], isLoadingMenus: false });
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('Failed to fetch menus');
      set({ isLoadingMenus: false });
    }
  },
  loadMenu: async (menuId: string) => {
    try {
      // Check for active session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session found when loading menu, returning early');
        return;
      }
      
      set({
        isLoadingMenu: true,
        name: '',
        guestCount: 1,
        prepDays: 1,
        courseCount: 3,
        courses: [],
        menuId: null,
        menuPlanningComplete: false,
        menuGenerated: false,
        originalMenuName: '',
        generatingRecipeForCourse: null,
        isGeneratingDocuments: false,
        menuDocuments: {
          mise_en_place: null,
          service_instructions: null,
          shopping_list: null,
          recipes: null
        },
        hasUnsavedChanges: false,
        originalConfig: null,
        showRegenerationConfirmation: false,
        pendingMenuGeneration: null
      });

      console.log('Loading menu with ID:', menuId);
      
      // First get the menu data
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .select('*')
        .eq('id', menuId)
        .single();

      if (menuError) {
        console.error('Error loading menu:', menuError);
        toast.error('Failed to load menu');
        set({ isLoadingMenu: false });
        return;
      }
      
      console.log('Loaded menu:', menu);

      // Then get course data
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('menu_id', menuId)
        .order('order', { ascending: true });

      if (coursesError) {
        console.error('Error loading courses:', coursesError);
        toast.error('Failed to load courses');
        set({ isLoadingMenu: false });
        return;
      }
      
      console.log('Loaded courses:', courses);

      // Get recipes only if we have courses
      if (!courses || courses.length === 0) {
        console.log('No courses found for menu');
        set({
          menuId: menu.id,
          name: menu.name,
          guestCount: menu.guest_count,
          prepDays: menu.prep_days,
          courses: [],
          menuPlanningComplete: false,
          menuGenerated: true,
          originalMenuName: menu.name,
          originalConfig: {
            guestCount: menu.guest_count,
            prepDays: menu.prep_days,
            courseCount: 3
          },
          isLoadingMenu: false
        });
        return;
      }
      
      const courseIds = courses.map(course => course.id);
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .in('course_id', courseIds);

      if (recipesError) {
        console.error('Error loading recipes:', recipesError);
        toast.error('Failed to load recipes');
      }
      
      console.log('Loaded recipes:', recipes || []);

      const recipeMap = (recipes || []).reduce((acc, recipe) => {
        acc[recipe.course_id] = recipe;
        return acc;
      }, {} as Record<string, any>);

      // Get menu documents
      const { data: documents, error: documentsError } = await supabase
        .from('menu_documents')
        .select('*')
        .eq('menu_id', menuId);

      if (documentsError) {
        console.error('Error loading menu documents:', documentsError);
      }

      const menuDocuments = (documents || []).reduce((acc, doc) => {
        acc[doc.document_type] = doc.content;
        return acc;
      }, {} as { [K in DocumentType]: string | null });

      const formattedCourses = courses.map(course => {
        console.log('Processing course:', course);
        const recipe = recipeMap?.[course.id];
        console.log('Found recipe for course:', recipe || 'No recipe found');
        
        return {
          id: course.id,
          title: course.title,
          order: course.order,
          description: course.description,
          dbId: course.id,
          recipe: recipe ? {
            id: recipe.id,
            course_id: course.id,
            title: recipe.title,
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            prep_time_minutes: recipe.prep_time_minutes || 0,
            cook_time_minutes: recipe.cook_time_minutes || 0,
            servings: recipe.servings || 0,
          } : undefined
        };
      });

      console.log('Formatted courses:', formattedCourses);

      set({
        menuId: menu.id,
        name: menu.name,
        guestCount: menu.guest_count,
        prepDays: menu.prep_days,
        courses: formattedCourses,
        menuDocuments: menuDocuments || {
          mise_en_place: null,
          service_instructions: null,
          shopping_list: null,
          recipes: null
        },
        menuPlanningComplete: !!documents?.length,
        menuGenerated: true,
        originalMenuName: menu.name,
        originalConfig: {
          guestCount: menu.guest_count,
          prepDays: menu.prep_days,
          courseCount: 3
        }
      });
    } catch (error) {
      console.error('Error loading menu:', error);
      toast.error('Failed to load menu');
    } finally {
      set({ isLoadingMenu: false });
    }
  },
  setName: async (name) => {
    set({ name, hasUnsavedChanges: true });
    
    const { menuId } = get();
    
    try {
      if (!menuId) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (!userId) {
          toast.error("You must be logged in to save a menu");
          return;
        }

        const { data: menu, error } = await supabase
          .from('menus')
          .insert({
            name: name.trim() || 'Untitled',
            guest_count: get().guestCount,
            prep_days: get().prepDays,
            user_id: userId
          })
          .select()
          .single();

        if (error) throw error;
        set({ 
          menuId: menu.id,
          originalConfig: {
            guestCount: get().guestCount,
            prepDays: get().prepDays,
            courseCount: get().courseCount
          }
        });
      } else {
        const { error } = await supabase
          .from('menus')
          .update({ name: name.trim() || 'Untitled' })
          .eq('id', menuId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to save menu name:', error);
      toast.error('Failed to save menu name');
    }
  },
  setGuestCount: (count) => {
    const state = get();
    if (state.menuGenerated && state.originalConfig && count !== state.originalConfig.guestCount) {
      toast.warning("Changing the guest count may affect the suitability of existing courses. Consider reviewing or regenerating recipes.");
    }
    set({ guestCount: count, hasUnsavedChanges: true });
  },
  setPrepDays: (days) => {
    const state = get();
    if (state.menuGenerated && state.originalConfig && days !== state.originalConfig.prepDays) {
      toast.warning("Changing the preparation days may affect the preparation timeline. Consider reviewing the mise en place.");
    }
    set({ prepDays: days, hasUnsavedChanges: true });
  },
  setCourseCount: (count) => {
    const state = get();
    if (state.menuGenerated && state.originalConfig && count !== state.originalConfig.courseCount) {
      toast.warning("Changing the course count doesn't affect existing courses. Generate a new menu to match the desired course count.");
    }
    set({ courseCount: count, hasUnsavedChanges: true });
  },
  addCourse: (course) =>
    set((state) => ({
      courses: [...state.courses, { ...course, id: crypto.randomUUID() }],
      hasUnsavedChanges: true
    })),
  removeCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((course) => course.id !== id),
      hasUnsavedChanges: true
    })),
  updateCourse: (id, updates) =>
    set((state) => ({
      courses: state.courses.map((course) =>
        course.id === id ? { ...course, ...updates } : course
      ),
      hasUnsavedChanges: true
    })),
  reorderCourses: (courses) => set({ courses, hasUnsavedChanges: true }),
  setMenuPlanningComplete: async (complete) => {
    const state = get();
    
    if (complete && state.hasUnsavedChanges) {
      set({ 
        menuPlanningComplete: complete,
        menuDocuments: {
          mise_en_place: null,
          service_instructions: null,
          shopping_list: null,
          recipes: null
        }
      });
      try {
        await get().generateMenuDocuments();
        set({ hasUnsavedChanges: false });
      } catch (error) {
        console.error('Failed to generate menu documents:', error);
        toast.error('Failed to generate menu documents');
      }
    } else {
      set({ menuPlanningComplete: complete });
    }
  },
  generateRecipe: async (courseId: string, requirements?: string) => {
    const { courses, guestCount, menuId } = get();
    const course = courses.find((c) => c.id === courseId);
    
    if (!course) {
      toast.error('Course not found');
      return;
    }

    set({ generatingRecipeForCourse: courseId });

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      toast.error("You must be logged in to generate recipes");
      set({ generatingRecipeForCourse: null });
      return;
    }

    try {
      if (!menuId) {
        await get().saveMenu();
      }

      const currentState = get();
      const updatedCourse = currentState.courses.find((c) => c.id === courseId);
      
      if (!currentState.menuId) {
        toast.error('Failed to save menu. Please try again.');
        return;
      }

      if (!updatedCourse?.dbId) {
        await get().saveMenu();
        const retryState = get();
        const retryCourse = retryState.courses.find((c) => c.id === courseId);
        
        if (!retryCourse?.dbId) {
          toast.error('Failed to save course. Please try again.');
          return;
        }
      }

      const finalCourse = get().courses.find((c) => c.id === courseId);
      if (!finalCourse?.dbId) {
        toast.error('Failed to save course. Please try again.');
        return;
      }

      const response = await supabase.functions.invoke('generate-recipe', {
        body: {
          courseTitle: finalCourse.title,
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
        course_id: finalCourse.dbId,
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
        .eq('id', finalCourse.dbId);

      if (updateCourseError) {
        console.error('Course update error:', updateCourseError);
        throw new Error('Failed to update course description');
      }

      const { data: savedRecipe, error: saveError } = await supabase
        .from('recipes')
        .insert(recipe)
        .select()
        .single();

      if (saveError) {
        console.error('Recipe save error:', saveError);
        throw new Error('Failed to save recipe');
      }

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, recipe: savedRecipe, description: response.data.description } : c
        ),
        hasUnsavedChanges: true
      }));

      toast.success('Recipe generated successfully!');
    } catch (error: any) {
      console.error('Recipe generation error:', error);
      toast.error(error.message || 'Failed to generate recipe');
      throw error;
    } finally {
      set({ generatingRecipeForCourse: null });
    }
  },
  generateMenu: async (prompt: string, guestCount: number, courseCount: number, withRecipes: boolean = false) => {
    const { courses } = get();
    
    if (courses.length > 0) {
      set({
        showRegenerationConfirmation: true,
        pendingMenuGeneration: { prompt, guestCount, courseCount, withRecipes }
      });
      return;
    }

    try {
      await get()._generateMenu(prompt, guestCount, courseCount, withRecipes);
    } catch (error) {
      console.error('Menu generation failed:', error);
      throw error;
    }
  },
  _generateMenu: async (prompt: string, guestCount: number, courseCount: number, withRecipes: boolean = false) => {
    const { menuId, saveMenu, addCourse, name } = get();
    
    if (guestCount < 1) {
      throw new Error('Guest count must be at least 1');
    }
    
    if (courseCount < 1) {
      throw new Error('Course count must be at least 1');
    }

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

    const response = await supabase.functions.invoke('generate-recipe', {
      body: {
        generateMenu: true,
        prompt: menuThemePrompt,
        menuName: name,
        guestCount,
        courseCount
      },
    });

    if (response.error) {
      console.error('Menu generation error:', response.error);
      throw new Error(response.error.message || 'Failed to generate menu');
    }

    if (!response.data?.courses || !Array.isArray(response.data.courses)) {
      throw new Error('No menu data received');
    }

    set({ courses: [] });

    response.data.courses.forEach((courseName: string) => {
      addCourse({
        title: courseName,
        order: get().courses.length,
      });
    });

    set({ 
      menuGenerated: true,
      originalMenuName: name,
      originalConfig: {
        guestCount,
        prepDays: get().prepDays,
        courseCount
      },
      hasUnsavedChanges: true
    });

    if (withRecipes) {
      const courses = get().courses;
      for (const course of courses) {
        try {
          await get().generateRecipe(course.id, `Please adjust all ingredient quantities to serve ${guestCount} people.`);
        } catch (error) {
          console.error(`Failed to generate recipe for course ${course.title}:`, error);
        }
      }
    }

    toast.success("Menu generated successfully!");
    return Promise.resolve();
  },
  saveMenu: async () => {
    const { name, guestCount, prepDays, courses, menuId } = get();
    
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      toast.error('You must be logged in to save a menu');
      return;
    }
    
    try {
      let currentMenuId = menuId;
      const menuName = name.trim() || 'Untitled';
      
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

        if (menuError) throw menuError;
        currentMenuId = menu.id;
        set({ menuId: currentMenuId });
      } else {
        const { error: updateError } = await supabase
          .from('menus')
          .update({
            name: menuName,
            guest_count: guestCount,
            prep_days: prepDays
          })
          .eq('id', currentMenuId);

        if (updateError) throw updateError;
      }

      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('menu_id', currentMenuId);

      if (deleteError) throw deleteError;

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

      if (savedCourses) {
        set((state) => ({
          courses: state.courses.map((course, index) => ({
            ...course,
            dbId: savedCourses[index].id,
          })),
        }));
      }
    } catch (error: any) {
      console.error('Menu save error:', error);
      toast.error(error.message || 'Failed to save menu');
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
    generatingRecipeForCourse: null,
    isGeneratingDocuments: false,
    menuDocuments: {
      mise_en_place: null,
      service_instructions: null,
      shopping_list: null,
      recipes: null
    },
    hasUnsavedChanges: false,
    originalConfig: null,
    showRegenerationConfirmation: false,
    pendingMenuGeneration: null,
  }),
  generateMenuDocuments: async () => {
    const { menuId, courses, guestCount, prepDays } = get();
    
    if (!menuId) {
      throw new Error('Menu ID is required to generate documents');
    }

    set({ isGeneratingDocuments: true });

    try {
      const { error: deleteError } = await supabase
        .from('menu_documents')
        .delete()
        .eq('menu_id', menuId);

      if (deleteError) {
        throw deleteError;
      }

      const response = await supabase.functions.invoke('generate-documents', {
        body: {
          menu_id: menuId,
          courses,
          guest_count: guestCount,
          prep_days: prepDays
        }
      });

      if (response.error) {
        throw response.error;
      }

      const { data: documents, error: fetchError } = await supabase
        .from('menu_documents')
        .select('*')
        .eq('menu_id', menuId);

      if (fetchError) {
        throw fetchError;
      }

      const updatedDocuments = {
        mise_en_place: null,
        service_instructions: null,
        shopping_list: null,
        recipes: null
      } as { [K in DocumentType]: string | null };

      documents?.forEach(doc => {
        updatedDocuments[doc.document_type] = doc.content;
      });

      set({ menuDocuments: updatedDocuments });
    } catch (error) {
      console.error('Error generating menu documents:', error);
      throw error;
    } finally {
      set({ isGeneratingDocuments: false });
    }
  },
  confirmMenuRegeneration: async () => {
    const { pendingMenuGeneration } = get();
    if (!pendingMenuGeneration) return;

    const { prompt, guestCount, courseCount, withRecipes } = pendingMenuGeneration;
    set({ showRegenerationConfirmation: false, pendingMenuGeneration: null });
    await get()._generateMenu(prompt, guestCount, courseCount, withRecipes);
  },
  cancelMenuRegeneration: () => {
    set({ showRegenerationConfirmation: false, pendingMenuGeneration: null });
  },
  deleteMenu: async (menuId: string) => {
    try {
      const { error: coursesError } = await supabase
        .from('courses')
        .delete()
        .eq('menu_id', menuId);

      if (coursesError) throw coursesError;

      const { error: documentsError } = await supabase
        .from('menu_documents')
        .delete()
        .eq('menu_id', menuId);

      if (documentsError) throw documentsError;

      const { error: menuError } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuId);

      if (menuError) throw menuError;

      set((state) => ({
        menus: state.menus.filter((menu) => menu.id !== menuId),
      }));

      toast.success('Menu deleted successfully');
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error('Failed to delete menu');
      throw error;
    }
  },
  createNewMenu: async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      toast.error("You must be logged in to create a menu");
      return null;
    }

    try {
      const defaultMenuName = 'Untitled Menu';
      const defaultGuestCount = 1;
      const defaultPrepDays = 1;

      const { data: menu, error } = await supabase
        .from('menus')
        .insert({
          name: defaultMenuName,
          guest_count: defaultGuestCount,
          prep_days: defaultPrepDays,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;
      
      return menu.id;
    } catch (error: any) {
      console.error('Failed to create new menu:', error);
      toast.error(error.message || 'Failed to create new menu');
      return null;
    }
  },
}));
