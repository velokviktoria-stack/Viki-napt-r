import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://txmypjrxogzxfwbxxumh.supabase.co'
const supabaseKey = 'sb_publishable_-YLARZf1zMpYcJtQyvxYOw_gArZ4CLv'

export const supabase = createClient(supabaseUrl, supabaseKey)
