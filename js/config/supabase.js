import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Remplace ces deux textes par l'URL et la clé ANON de ton projet Supabase
const SUPABASE_URL = 'https://bvehhmbowizwsqrbdnwu.supabase.co/rest/v1/

'
const SUPABASE_KEY = 'sb_publishable_B4I-hDnB8ic_IRa7ZRIRMQ_zGrteY2Q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

