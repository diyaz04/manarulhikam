import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: users, error: ue } = await supabase.from('users').select('*').ilike('full_name', '%diyaz%')
  console.log("Users:", users)
  
  if (users && users.length > 0) {
    const { data: roles, error: re } = await supabase.from('user_roles').select('*').eq('user_id', users[0].id)
    console.log("Roles:", roles)
  }
}
check()
