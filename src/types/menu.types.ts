
import type { Database } from '@/types/database.types';

export type MenuDocument = Database['public']['Tables']['menu_documents']['Row'];
export type DocumentType = Database['public']['Enums']['document_type'];

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
}
