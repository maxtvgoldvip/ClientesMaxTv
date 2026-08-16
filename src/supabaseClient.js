import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wnjtbsytxcmvolyhhdqp.supabase.co'
const supabaseAnonKey = 'sb_publishable_kDQbhebKLBotK_H484CcRA_6Gc41ugz'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
