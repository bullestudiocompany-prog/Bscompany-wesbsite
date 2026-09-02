import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const URL = "https://bvehhmbowizwsqrbdnwu.supabase.co"; const KEY = "sb_publishable_B4I-hDnB8ic_IRa7ZRIRMQ_zGrteY2Q";

export const supabase = createClient(URL, KEY);

