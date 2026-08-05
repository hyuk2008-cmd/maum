"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex-1 max-w-sm mx-auto w-full px-4 py-16">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← 홈으로
      </Link>

      <h1 className="text-2xl font-bold mt-4 mb-1">로그인</h1>
      <p className="text-neutral-600 text-sm mb-6">
        비밀번호 없이 이메일 인증만으로 로그인해요.
      </p>

      {sent ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <p className="font-semibold mb-1">메일을 확인해주세요!</p>
          <p className="text-sm text-neutral-600">
            {email} 주소로 로그인 링크를 보냈어요. 메일함(스팸함도 확인)에서
            링크를 클릭하면 자동으로 로그인됩니다.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            required
            className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-50"
          >
            {loading ? "보내는 중..." : "로그인 링크 받기"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </main>
  );
}
