import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'IDE_JÖN_A_PROJECT_URL'
const supabaseKey = 'IDE_JÖN_A_PUBLIKÁLHATÓ_KULCS'

export const supabase = createClient(supabaseUrl, supabaseKey)
