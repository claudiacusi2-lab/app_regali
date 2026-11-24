// Login dell'area riservata (Supabase Auth, email + password).
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export function useAdminSession() {
  const [status, setStatus] = useState({ loading: true, session: null, isAdmin: false });

  useEffect(() => {
    let alive = true;

    async function check(session) {
      if (!session) {
        if (alive) setStatus({ loading: false, session: null, isAdmin: false });
        return;
      }
      const { data } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
      if (alive) setStatus({ loading: false, session, isAdmin: Boolean(data) });
    }

    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // fuori dal callback per evitare blocchi del client
      setTimeout(() => check(session), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return status;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? 'Email o password non corretti.' : '';
}

export async function signOut() {
  await supabase.auth.signOut();
}
