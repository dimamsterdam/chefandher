
import { Database as BaseDatabase } from '@/types/supabase'

export type DocumentType = 'mise_en_place' | 'service_instructions' | 'shopping_list' | 'recipes'

export type CourseType = 'starter' | 'main' | 'side' | 'dessert'

export interface MenuDocument {
  id: string
  menu_id: string
  document_type: DocumentType
  content: string
  created_at: string
  updated_at: string
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
  courseType?: CourseType;
  parentCourseId?: string | null;
}

export interface Database extends BaseDatabase {
  public: {
    Tables: {
      menu_documents: {
        Row: MenuDocument
        Insert: Omit<MenuDocument, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MenuDocument, 'id' | 'created_at' | 'updated_at'>>
        Relationships: [
          {
            foreignKeyName: "menu_documents_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: BaseDatabase['public']['Tables']['courses']
      menus: BaseDatabase['public']['Tables']['menus']
      profiles: BaseDatabase['public']['Tables']['profiles']
      recipes: BaseDatabase['public']['Tables']['recipes']
    }
    Views: BaseDatabase['public']['Views']
    Functions: BaseDatabase['public']['Functions']
    Enums: {
      document_type: DocumentType
      course_type: CourseType
    }
    CompositeTypes: BaseDatabase['public']['CompositeTypes']
  }
}
