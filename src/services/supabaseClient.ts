import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdxezdwylvxwtbzydnir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkeGV6ZHd5bHZ4d3RienlkbmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY4NTUsImV4cCI6MjA4NDUwMjg1NX0.ERCFnKQLSNOCtHzagNJWxRp7aU18K_p0y1T9P3Cq9ZE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadImage(base64: string, path: string) {
  try {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const { data, error } = await supabase.storage
      .from('scans')
      .upload(path, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('scans')
      .getPublicUrl(path);

    return publicUrl;
  } catch (e: any) {
    console.error("Upload Helper Error:", e);
    throw e;
  }
}