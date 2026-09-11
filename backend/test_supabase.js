import { supabase } from './lib/supabase.js';

async function check() {
  console.log('Testing Supabase connection...');
  try {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
    console.log('Profiles table:', pErr ? `ERROR: ${pErr.message}` : `OK (${profiles?.length} rows)`);

    const { data: missions, error: mErr } = await supabase.from('missions').select('*').limit(1);
    console.log('Missions table:', mErr ? `ERROR: ${mErr.message}` : `OK (${missions?.length} rows)`);

    const { data: biometrics, error: bErr } = await supabase.from('biometrics').select('*').limit(1);
    console.log('Biometrics table:', bErr ? `ERROR: ${bErr.message}` : `OK (${biometrics?.length} rows)`);
  } catch (err) {
    console.error('Exception during Supabase query:', err);
  }
  process.exit(0);
}

check();


