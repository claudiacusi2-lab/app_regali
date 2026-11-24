import { createClient } from '@supabase/supabase-js';

// Dati PUBBLICI del progetto Supabase: è normale che stiano nel sito.
// La protezione dei dati la fanno le regole (RLS) in supabase/schema.sql.
// NON mettere mai qui la chiave segreta (sb_secret_… / service_role).
export const SUPABASE_URL = 'https://czcvljauununjwnbkwrh.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_71oDCl7Az17PDmuXufU7pA_jysp4XxU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
