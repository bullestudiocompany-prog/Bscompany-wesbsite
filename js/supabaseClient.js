import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://bvehhmbowizwsqrbdnwu.supabase.co/rest/v1/'; // Remplace par ton URL Supabase
const supabaseAnonKey = 'sb_publishable_B4I-hDnB8ic_IRa7ZRIRMQ_zGrteY2Q';           // Remplace par ta clé anon public

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

