import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';

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
  courses: Course[];
  menuId: string | null;
  menuPlanningComplete: boolean;
  setName: (name: string) => void;
  setGuestCount: (count: number) => void;
  setPrepDays: (days: number) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  reorderCourses: (courses: Course[]) => void;
  generateRecipe: (courseId: string, requirements?: string) => Promise<void>;
  generateMenu: (prompt: string) => Promise<void>;
  saveMenu: () => Promise<void>;
  setMenuPlanningComplete: (complete: boolean) => void;
  reset: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  name: '',
  courses: [],
  guestCount: 1,
  prepDays: 1,
  menuId: null,
  menuPlanningComplete: false,
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
    const { user } = useAuthStore.getState();
    const course = courses.find((c) => c.id === courseId);
    
    if (!course) {
      toast.error('Course not found');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to generate recipes');
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
        created_by: user.id,
        ...response.data,
      };

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
          c.id === courseId ? { ...c, recipe: savedRecipe } : c
        ),
      }));

      toast.success('Recipe generated successfully!');
    } catch (error: any) {
      console.error('Recipe generation error:', error);
      toast.error(error.message || 'Failed to generate recipe');
      throw error;
    }
  },
  generateMenu: async (prompt: string) => {
    const { user } = useAuthStore.getState();
    const { menuId, saveMenu, addCourse, name, guestCount } = get();
    
    if (!user) {
      toast.error('You must be logged in to generate a menu');
      return;
    }

    try {
      if (!menuId) {
        await saveMenu();
      }

      let courseCount = 3; // Default
      const match = prompt.match(/approximately\s+(\d+)\s+courses/i);
      if (match && match[1]) {
        courseCount = parseInt(match[1], 10);
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
          guestCount: guestCount
        },
      });

      if (response.error) {
        console.error('Menu generation error:', response.error);
        throw new Error(response.error.message || 'Failed to generate menu');
      }

      if (!response.data?.courses || !Array.isArray(response.data.courses)) {
        throw new Error('No menu data received');
      }

      response.data.courses.forEach((courseName: string) => {
        addCourse({
          title: courseName,
          order: get().courses.length,
        });
      });

      toast.success('Menu generated successfully!');
    } catch (error: any) {
      console.error('Menu generation error:', error);
      toast.error(error.message || 'Failed to generate menu');
      throw error;
    }
  },
  saveMenu: async () => {
    const { name, guestCount, prepDays, courses, menuId } = get();
    const { user } = useAuthStore.getState();
    
    if (!user) {
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
            user_id: user.id
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
    menuId: null,
    menuPlanningComplete: false,
  }),
}));
