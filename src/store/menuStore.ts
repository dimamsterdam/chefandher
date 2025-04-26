import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MenuState, Course } from '@/types/menu.types';
import { generateRecipeForCourse } from '@/utils/menuUtils';
import { fetchUserMenus, saveMenu, saveCourses, deleteMenu as deleteMenuService } from '@/services/menuService';

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
      const menus = await fetchUserMenus();
      set({ menus, isLoadingMenus: false });
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('Failed to fetch menus. Please try again.');
      set({ isLoadingMenus: false });
    }
  },

  retryFetchMenus: async () => {
    toast.info('Retrying menu fetch...');
    
    try {
      await get().fetchMenus();
      toast.success('Menus refreshed successfully');
    } catch (error) {
      console.error('Failed to retry fetching menus:', error);
      toast.error('Menu refresh failed. Please check your connection.');
    }
  },

  loadMenu: async (menuId: string) => {
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

    try {
      console.log('Loading menu with ID:', menuId);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error in loadMenu:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!session) {
        console.error('No active session found in loadMenu');
        throw new Error('No authenticated session available');
      }
      
      const { data: menu, error: menuError } = await withRetry(
        async () => supabase
          .from('menus')
          .select('*')
          .eq('id', menuId)
          .single(),
        3,
        'Retrying menu load operation'
      );

      if (menuError) throw menuError;
      console.log('Loaded menu:', menu);

      const { data: courses, error: coursesError } = await withRetry(
        async () => supabase
          .from('courses')
          .select('*')
          .eq('menu_id', menuId)
          .order('order', { ascending: true }),
        3,
        'Retrying courses fetch operation'
      );

      if (coursesError) throw coursesError;
      console.log('Loaded courses:', courses);

      const courseIds = courses?.map(course => course.id) || [];
      let recipes: any[] | null = null;
      
      if (courseIds.length > 0) {
        const { data: fetchedRecipes, error: recipesError } = await withRetry(
          async () => supabase
            .from('recipes')
            .select('*')
            .in('course_id', courseIds),
          3,
          'Retrying recipes fetch operation'
        );

        if (recipesError) throw recipesError;
        recipes = fetchedRecipes;
        console.log('Loaded recipes:', recipes);
      } else {
        console.log('No courses found, skipping recipe fetch');
        recipes = [];
      }

      const { data: documents, error: documentsError } = await withRetry(
        async () => supabase
          .from('menu_documents')
          .select('*')
          .eq('menu_id', menuId),
        3,
        'Retrying documents fetch operation'
      );

      if (documentsError) throw documentsError;

      const recipeMap = recipes?.reduce((acc, recipe) => {
        acc[recipe.course_id] = recipe;
        return acc;
      }, {} as Record<string, any>);

      const menuDocuments = documents?.reduce((acc, doc) => {
        acc[doc.document_type] = doc.content;
        return acc;
      }, {} as { [K in DocumentType]: string | null });

      const formattedCourses = courses?.map(course => {
        console.log('Processing course:', course);
        const recipe = recipeMap?.[course.id];
        console.log('Found recipe for course:', recipe);
        
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
      }) || [];

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
      console.log('Menu load completed successfully');
    } catch (error) {
      console.error('Error loading menu:', error);
      toast.error('Failed to load menu. Please try again.');
    } finally {
      set({ isLoadingMenu: false });
    }
  },

  setName: async (name) => {
    set({ name, hasUnsavedChanges: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        toast.error("You must be logged in to save a menu");
        return;
      }

      const menu = await saveMenu(name, get().guestCount, get().prepDays, userId, get().menuId);
      if (menu) {
        set({ 
          menuId: menu.id,
          originalConfig: {
            guestCount: get().guestCount,
            prepDays: get().prepDays,
            courseCount: get().courseCount
          }
        });
      }
    } catch (error: any) {
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
    set({ generatingRecipeForCourse: courseId });

    try {
      const result = await generateRecipeForCourse(courseId, requirements, guestCount, menuId, courses);
      
      if (result) {
        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === courseId ? { ...c, recipe: result.savedRecipe, description: result.description } : c
          ),
          hasUnsavedChanges: true
        }));
        toast.success('Recipe generated successfully!');
      }
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
      const menu = await saveMenu(name, guestCount, prepDays, userId, menuId);
      if (menu) {
        set({ menuId: menu.id });
      }

      const savedCourses = await saveCourses(courses, menuId || menu!.id);
      
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
      await deleteMenuService(menuId);
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
