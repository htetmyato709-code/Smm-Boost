// js/config.js
export const SUPABASE_URL = "https://ckcmkgljdiqbpfwnhbao.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrY21rZ2xqZGlxYnBmd25oYmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTY1NjksImV4cCI6MjEwNTYzMjU2OX0.Lv5U-zOKfCWFs0hMMFDY7iwB0vCvEcZWaTD2LJFX71s";

export const ADMIN_EMAIL = "chanyatewai2@gmail.com";

// Supabase Client ဖန်တီးခြင်း
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin စစ်ဆေးခြင်း
export async function checkIsAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return user.email === ADMIN_EMAIL;
}
