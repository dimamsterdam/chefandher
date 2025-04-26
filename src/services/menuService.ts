
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/utils/menuUtils';
import { Course, Menu } from '@/types/menu.types';
import { toast } from 'sonner';

export async function fetchUserMenus() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('No active session found in fetchMenus');
    return [];
  }

  const { data: menus, error } = await withRetry(
    async () => supabase
      .from('menus')
      .select()
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
  );

  if (error) throw error;
  return menus || [];
}

export async function saveMenu(name: string, guestCount: number, prepDays: number, userId: string, menuId: string | null) {
  if (!menuId) {
    const { data: menu, error } = await withRetry(
      async () => supabase
        .from('menus')
        .insert({
          name: name.trim() || 'Untitled',
          guest_count: guestCount,
          prep_days: prepDays,
          user_id: userId
        })
        .select()
        .single()
    );

    if (error) throw error;
    return menu;
  } else {
    const { error } = await withRetry(
      async () => supabase
        .from('menus')
        .update({
          name: name.trim() || 'Untitled',
          guest_count: guestCount,
          prep_days: prepDays
        })
        .eq('id', menuId)
    );

    if (error) throw error;
    return null;
  }
}

export async function saveCourses(courses: Course[], menuId: string) {
  const { error: deleteError } = await supabase
    .from('courses')
    .delete()
    .eq('menu_id', menuId);

  if (deleteError) throw deleteError;

  const { data: savedCourses, error: coursesError } = await supabase
    .from('courses')
    .insert(
      courses.map((course) => ({
        menu_id: menuId,
        title: course.title,
        order: course.order,
        description: course.description
      }))
    )
    .select();

  if (coursesError) throw coursesError;
  return savedCourses;
}

export async function deleteMenu(menuId: string) {
  try {
    const { error: coursesError } = await supabase
      .from('courses')
      .delete()
      .eq('menu_id', menuId);

    if (coursesError) throw coursesError;

    const { error: documentsError } = await supabase
      .from('menu_documents')
      .delete()
      .eq('menu_id', menuId);

    if (documentsError) throw documentsError;

    const { error: menuError } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId);

    if (menuError) throw menuError;

    return true;
  } catch (error) {
    console.error('Error deleting menu:', error);
    throw error;
  }
}
