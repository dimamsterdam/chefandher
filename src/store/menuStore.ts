
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
}

// Helper function to get the current user session
async function getCurrentUserId(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      throw new Error('User must be logged in');
    }
    
    return userId;
  } catch (error) {
    console.error('Error getting current user session:', error);
    throw new Error('Failed to authenticate user');
  }
}

export const useMenuStore = create<MenuState>((set, get) => ({
  name: '',
  courses: [],
  guestCount: 1,
  prepDays: 1,
  courseCount: 3, // Default course count
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

    try {
      // Make sure we have a menuId first
      if (!menuId) {
        await get().saveMenu();
      }

      // Get the updated course with dbId
      const currentState = get();
      const updatedCourse = currentState.courses.find((c) => c.id === courseId);
      
      if (!currentState.menuId) {
        toast.error('Failed to save menu. Please try again.');
        return;
      }

      // If the course doesn't have a dbId yet, try saving again
      if (!updatedCourse?.dbId) {
        await get().saveMenu();
        const retryState = get();
        const retryCourse = retryState.courses.find((c) => c.id === courseId);
        
        if (!retryCourse?.dbId) {
          toast.error('Failed to save course. Please try again.');
          return;
        }
      }

      // Get the final course with dbId
      const finalCourse = get().courses.find((c) => c.id === courseId);
      if (!finalCourse?.dbId) {
        toast.error('Failed to save course. Please try again.');
        return;
      }

      // Get the current user ID
      const userId = await getCurrentUserId();

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
    try {
      // Create a menu first if we don't have one
      if (!get().menuId) {
        await get().saveMenu();
      }
      
      const { name, guestCount, courseCount } = get();
      
      // Get the current user ID for validation
      await getCurrentUserId();

      const response = await supabase.functions.invoke('generate-recipe', {
        body: {
          generateMenu: true,
          prompt: prompt,
          menuName: name,
          guestCount: guestCount,
          courseCount: courseCount
        },
      });

      if (response.error) {
        console.error('Menu generation error:', response.error);
        throw new Error(response.error.message || 'Failed to generate menu');
      }

      if (!response.data?.courses || !Array.isArray(response.data.courses)) {
        console.error('Invalid menu data structure:', response.data);
        throw new Error('Invalid menu structure received');
      }

      // Clear existing courses first
      set({ courses: [] });

      // Add the generated courses
      response.data.courses.forEach((courseName: string, index: number) => {
        get().addCourse({
          title: courseName,
          order: index,
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
    try {
      // Get the current user ID first to fail early if not authenticated
      const userId = await getCurrentUserId();
      
      const { name, guestCount, prepDays, courses, menuId } = get();
      const menuName = name.trim() || 'Untitled';
      
      let currentMenuId = menuId;
      
      // Create or update the menu
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
          throw new Error('Failed to create menu');
        }
        
        if (!menu || !menu.id) {
          throw new Error('Failed to create menu: No ID returned');
        }
        
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

        if (updateError) {
          console.error('Menu update error:', updateError);
          throw new Error('Failed to update menu');
        }
      }

      // Only manage courses if we have some
      if (courses.length > 0) {
        try {
          // First delete existing courses
          const { error: deleteError } = await supabase
            .from('courses')
            .delete()
            .eq('menu_id', currentMenuId);
  
          if (deleteError) {
            console.error('Course deletion error:', deleteError);
            throw new Error('Failed to update courses');
          }
  
          // Then add the new courses
          const coursesToInsert = courses.map((course) => ({
            menu_id: currentMenuId,
            title: course.title,
            order: course.order,
          }));
          
          const { data: savedCourses, error: coursesError } = await supabase
            .from('courses')
            .insert(coursesToInsert)
            .select();
  
          if (coursesError) {
            console.error('Course insertion error:', coursesError);
            throw new Error('Failed to save courses');
          }
  
          // Update courses with their database IDs
          if (savedCourses && savedCourses.length > 0) {
            set((state) => ({
              courses: state.courses.map((course, index) => {
                // Make sure we don't go beyond the array bounds
                if (index < savedCourses.length) {
                  return {
                    ...course,
                    dbId: savedCourses[index].id,
                  };
                }
                return course;
              }),
            }));
          }
        } catch (error) {
          console.error('Error handling courses:', error);
          // Even with course errors, if we have a menu ID, we should return it
          // so future operations can continue
        }
      }
      
      return currentMenuId;
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
  }),
}));
