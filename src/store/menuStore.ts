
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
}

interface MenuState {
  name: string;
  guestCount: number;
  prepDays: number;
  courses: Course[];
  setName: (name: string) => void;
  setGuestCount: (count: number) => void;
  setPrepDays: (days: number) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  reorderCourses: (courses: Course[]) => void;
  generateRecipe: (courseId: string, requirements?: string) => Promise<void>;
  saveMenu: () => Promise<void>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  name: '',
  courses: [],
  guestCount: 1,
  prepDays: 1,
  setName: (name) => set({ name }),
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
  generateRecipe: async (courseId: string, requirements?: string) => {
    const { courses, guestCount } = get();
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
      // First check if the menu for this course exists in the database
      const { data: courseCheck, error: courseCheckError } = await supabase
        .from('courses')
        .select('menu_id')
        .eq('id', courseId)
        .single();

      if (courseCheckError) {
        console.error('Course check error:', courseCheckError);
        toast.error('Failed to verify course ownership');
        return;
      }

      if (!courseCheck) {
        toast.error('Please save the menu before generating recipes');
        return;
      }

      const response = await supabase.functions.invoke('generate-recipe', {
        body: {
          courseTitle: course.title,
          guestCount,
          requirements,
        },
      });

      if (response.error) throw response.error;

      const recipe: Recipe = {
        course_id: courseId,
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
    }
  },
  saveMenu: async () => {
    const { name, guestCount, prepDays, courses } = get();
    const { user } = useAuthStore.getState();
    
    if (!user) {
      toast.error('You must be logged in to save a menu');
      return;
    }
    
    try {
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .insert({
          name,
          guest_count: guestCount,
          prep_days: prepDays,
          user_id: user.id
        })
        .select()
        .single();

      if (menuError) throw menuError;

      const { error: coursesError } = await supabase
        .from('courses')
        .insert(
          courses.map((course) => ({
            menu_id: menu.id,
            title: course.title,
            order: course.order,
          }))
        );

      if (coursesError) throw coursesError;

      toast.success('Menu saved successfully!');
      
      // Reset the form
      set({
        name: '',
        courses: [],
        guestCount: 1,
        prepDays: 1,
      });
    } catch (error: any) {
      console.error('Menu save error:', error);
      toast.error(error.message || 'Failed to save menu');
    }
  },
}));
