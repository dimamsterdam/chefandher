
-- Add course_type enum
CREATE TYPE public.course_type AS ENUM ('starter', 'main', 'side', 'dessert');

-- Add course_type column to courses table
ALTER TABLE public.courses ADD COLUMN course_type course_type;

-- Add parent_course_id for side dishes
ALTER TABLE public.courses ADD COLUMN parent_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
