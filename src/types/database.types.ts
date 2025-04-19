
import { Database as BaseDatabase } from '@/types/supabase'

export type DocumentType = 'mise_en_place' | 'service_instructions' | 'shopping_list' | 'recipes'

export interface MenuDocument {
  id: string
  menu_id: string
  document_type: DocumentType
  content: string
  created_at: string
  updated_at: string
}

export interface Database extends BaseDatabase {
  public: {
    Tables: {
      menu_documents: {
        Row: MenuDocument
        Insert: Omit<MenuDocument, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MenuDocument, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: BaseDatabase['public']['Views']
    Functions: BaseDatabase['public']['Functions']
    Enums: {
      document_type: DocumentType
    }
    CompositeTypes: BaseDatabase['public']['CompositeTypes']
  }
}
