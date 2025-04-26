
import type { Database } from '@/types/database.types';

export type MenuDocument = Database['public']['Tables']['menu_documents']['Row'];
export type DocumentType = 'mise_en_place' | 'service_instructions' | 'shopping_list' | 'recipes';

export interface Menu {
  id: string;
  name: string;
  created_at: string;
  guest_count: number;
  prep_days: number;
  course_count: number;
}

export interface Recipe {
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

export interface Course {
  id: string;
  title: string;
  order: number;
  description?: string | null;
  recipe?: Recipe;
  dbId?: string;
}

export interface MenuState {
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

  // Adding the missing methods
  fetchMenus: () => Promise<void>;
  retryFetchMenus: () => Promise<void>;
  loadMenu: (menuId: string) => Promise<void>;
  setName: (name: string) => Promise<void>;
  setGuestCount: (count: number) => void;
  setPrepDays: (days: number) => void;
  setCourseCount: (count: number) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  reorderCourses: (courses: Course[]) => void;
  setMenuPlanningComplete: (complete: boolean) => Promise<void>;
  generateRecipe: (courseId: string, requirements?: string) => Promise<void>;
  generateMenu: (prompt: string, guestCount: number, courseCount: number, withRecipes?: boolean) => Promise<void>;
  _generateMenu: (prompt: string, guestCount: number, courseCount: number, withRecipes?: boolean) => Promise<void>;
  saveMenu: () => Promise<void>;
  reset: () => void;
  generateMenuDocuments: () => Promise<void>;
  confirmMenuRegeneration: () => Promise<void>;
  cancelMenuRegeneration: () => void;
  deleteMenu: (menuId: string) => Promise<void>;
  createNewMenu: () => Promise<string | null>;
}
