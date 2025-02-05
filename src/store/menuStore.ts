
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  order: number;
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
  saveMenu: async () => {
    const { name, guestCount, prepDays, courses } = get();
    
    try {
      // First, create the menu
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .insert({
          name,
          guest_count: guestCount,
          prep_days: prepDays,
        })
        .select()
        .single();

      if (menuError) throw menuError;

      // Then, create all courses
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
      toast.error(error.message);
    }
  },
}));
