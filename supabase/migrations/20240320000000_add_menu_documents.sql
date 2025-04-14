-- Create enum for document types
CREATE TYPE document_type AS ENUM ('mise_en_place', 'service_instructions', 'shopping_list');

-- Create table for menu documents
CREATE TABLE menu_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(menu_id, document_type)
);

-- Add RLS policies
ALTER TABLE menu_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own menu documents"
    ON menu_documents FOR SELECT
    USING (
        menu_id IN (
            SELECT id FROM menus 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own menu documents"
    ON menu_documents FOR INSERT
    WITH CHECK (
        menu_id IN (
            SELECT id FROM menus 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own menu documents"
    ON menu_documents FOR UPDATE
    USING (
        menu_id IN (
            SELECT id FROM menus 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own menu documents"
    ON menu_documents FOR DELETE
    USING (
        menu_id IN (
            SELECT id FROM menus 
            WHERE user_id = auth.uid()
        )
    ); 