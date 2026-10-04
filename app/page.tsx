'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'

export default function Home() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  // Google ログイン処理
  const handleGoogleLogin = async () => {
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setMessage(`エラー: ${error.message}`)
    }
  }

  // メールアドレス ログイン処理
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setMessage(`エラー: ${error.message}`)
    }
  }

  // メールアドレス 新規登録処理
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setMessage(`エラー: ${error.message}`)
    } else {
      setMessage('確認メールを送信しました。メールをご確認ください。')
    }
  }

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        {user ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
            <p className="text-sm text-gray-600">
              ログイン中: <span className="font-semibold text-gray-800">{user.email}</span>
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">ログイン / 新規登録</h1>
              <p className="text-sm text-gray-500 mt-1">Task Board へアクセス</p>
            </div>

            {message && (
              <div className="p-3 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200">
                {message}
              </div>
            )}

            {/* Google ログインボタン */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google でログイン
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">または</span>
              </div>
            </div>

            {/* メールアドレス ログインフォーム */}
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleEmailLogin}
                  className="w-1/2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md text-sm transition"
                >
                  ログイン
                </button>
                <button
                  type="button"
                  onClick={handleSignUp}
                  className="w-1/2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md text-sm transition"
                >
                  新規登録
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}