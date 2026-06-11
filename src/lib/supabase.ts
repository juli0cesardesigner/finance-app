import { createClient } from "@supabase/supabase-js";

// Pegando do ambiente ou usando fallbacks para desenvolvimento local do CLI
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NzAwMDAsImV4cCI6MjAzMzQzMDAwMH0.dummy"; // Anon key mock do Supabase local

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
