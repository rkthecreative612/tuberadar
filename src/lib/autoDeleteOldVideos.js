import supabase from './supabase';

export async function deleteOldDeletedVideos() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('planner_videos')
      .delete()
      .lt('deleted_at', thirtyDaysAgo)
      .eq('is_deleted', true);

    if (error) throw error;
    console.log('✅ Auto-deleted old videos');
  } catch (err) {
    console.error('Error in auto-delete job:', err);
  }
}
