"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (user === undefined) {
    return <div className="h-8" />;
  }

  return (
    <div className="flex items-center justify-end gap-3 max-w-4xl mx-auto w-full px-4 py-2 text-sm">
      {user ? (
        <>
          <span className="text-neutral-500 truncate max-w-[200px]">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-neutral-600 hover:underline shrink-0"
          >
            로그아웃
          </button>
        </>
      ) : (
        <a href="/login" className="text-neutral-700 font-medium hover:underline">
          로그인
        </a>
      )}
    </div>
  );
}
