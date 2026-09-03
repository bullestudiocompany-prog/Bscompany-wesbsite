import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://bvehhmbowizwsqrbdnwu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_B4I-hDnB8ic_IRa7ZRIRMQ_zGrteY2Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
