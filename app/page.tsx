'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Task = {
  id: string
  title: string
  date: string
  status: '未着手' | '進行中' | '完了'
  category: string
  user_id: string
}

type Note = {
  id: string
  content: string
  color: string
  user_id: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')

  // アプリケーションデータ
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('一般')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteColor, setNewNoteColor] = useState('bg-yellow-100')

  // 今日の日付＆直近2週間の日付リスト生成
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const twoWeeksDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(today.getDate() + i)
    return {
      dateStr: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      dayName: ['日', '月', '火', '水', '木', '金', '土'][d.getDay()],
      isWeekend: d.getDay() === 0 || d.getDay() === 6
    }
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchData(user.id)
      }
      setLoading(false)
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchData(currentUser.id)
      } else {
        setTasks([])
        setNotes([])
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const fetchData = async (userId: string) => {
    // タスク取得
    const { data: taskData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
    if (taskData) setTasks(taskData)

    // 付箋取得
    const { data: noteData } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
    if (noteData) setNotes(noteData)
  }

  // Google ログイン
  const handleGoogleLogin = async () => {
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setMessage(`エラー: ${error.message}`)
  }

  // メール認証
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) setMessage(`エラー: ${error.message}`)
      else setMessage('確認メールを送信しました。')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(`エラー: ${error.message}`)
    }
  }

  // タスク追加
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !user) return

    const newTask = {
      title: newTaskTitle.trim(),
      date: newTaskDate || todayStr,
      status: '未着手' as const,
      category: newTaskCategory,
      user_id: user.id
    }

    const { data, error } = await supabase.from('tasks').insert([newTask]).select()
    if (data) {
      setTasks([...tasks, data[0]])
      setNewTaskTitle('')
    }
  }

  // タスクステータス更新
  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  // タスク削除
  const handleDeleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  // 付箋追加
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteContent.trim() || !user) return

    const newNote = {
      content: newNoteContent.trim(),
      color: newNoteColor,
      user_id: user.id
    }

    const { data } = await supabase.from('notes').insert([newNote]).select()
    if (data) {
      setNotes([...notes, data[0]])
      setNewNoteContent('')
    }
  }

  // 付箋削除
  const handleDeleteNote = async (noteId: string) => {
    await supabase.from('notes').delete().eq('id', noteId)
    setNotes(notes.filter(n => n.id !== noteId))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-gray-500 font-medium">読み込み中...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800">📌 タスクボード</h1>
          </div>
          {message && <div className="p-3 text-sm rounded bg-amber-50 text-amber-800 border text-center">{message}</div>}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-white border border-gray-300 rounded-xl shadow-sm font-bold text-slate-700 hover:bg-gray-50 flex items-center justify-center gap-3"
          >
            Google でログイン
          </button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">または</span></div>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 rounded-xl border text-sm" />
            <input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-3 rounded-xl border text-sm" />
            <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow text-sm">
              {isSignUp ? 'アカウント作成' : 'ログイン'}
            </button>
          </form>
          <div className="text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-slate-500 hover:underline">
              {isSignUp ? 'ログインはこちら' : 'アカウント作成はこちら'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 space-y-8">
      {/* ヘッダー */}
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">📌 ダッシュボード & タスクボード</h1>
          <p className="text-xs text-slate-500 mt-1">ログインユーザー: <span className="font-semibold text-slate-700">{user.email}</span></p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-medium text-xs rounded-xl border">
          ログアウト
        </button>
      </header>

      {/* 📅 直近2週間の予定（カレンダービュー） */}
      <section className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">📅 直近2週間のスケジュール</h2>
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 overflow-x-auto pb-2">
          {twoWeeksDates.map(({ dateStr, dayNum, dayName, isWeekend }) => {
            const dayTasks = tasks.filter(t => t.date === dateStr)
            const isToday = dateStr === todayStr
            return (
              <div key={dateStr} className={`p-3 rounded-xl border min-h-[120px] flex flex-col justify-between ${isToday ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-center border-b pb-1 mb-2">
                  <span className={`text-xs font-bold ${isWeekend ? 'text-red-500' : 'text-slate-600'}`}>{dayNum}日 ({dayName})</span>
                  {isToday && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">今日</span>}
                </div>
                <div className="space-y-1 flex-1 overflow-y-auto">
                  {dayTasks.map(t => (
                    <div key={t.id} className="text-[11px] p-1.5 rounded bg-white border border-slate-200 shadow-xs truncate" title={t.title}>
                      {t.status === '完了' ? '✅ ' : '⏳ '}{t.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* メインレイアウト: 表形式タスク一覧 & 付箋メモ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 📊 タスク管理（表形式） */}
        <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">📊 タスク一覧（表管理）</h2>

          {/* 新規タスク追加 */}
          <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input type="text" placeholder="タスク名を入力..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required className="sm:col-span-2 p-2.5 rounded-xl border text-sm" />
            <input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="p-2.5 rounded-xl border text-sm" />
            <button type="submit" className="p-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm">タスク追加</button>
          </form>

          {/* タスク表（テーブル） */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50">
                  <th className="p-3">日付</th>
                  <th className="p-3">タスク名</th>
                  <th className="p-3">ステータス</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">タスクが登録されていません。</td>
                  </tr>
                ) : (
                  tasks.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-slate-500 text-xs font-mono">{t.date}</td>
                      <td className={`p-3 font-medium ${t.status === '完了' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</td>
                      <td className="p-3">
                        <select
                          value={t.status}
                          onChange={e => handleStatusChange(t.id, e.target.value as Task['status'])}
                          className={`text-xs px-2 py-1 rounded-lg border font-semibold ${
                            t.status === '完了' ? 'bg-green-50 text-green-700 border-green-200' :
                            t.status === '進行中' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <option value="未着手">未着手</option>
                          <option value="進行中">進行中</option>
                          <option value="完了">完了</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDeleteTask(t.id)} className="text-slate-400 hover:text-red-500 p-1">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 📝 付箋メモ機能 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">📝 付箋メモ</h2>

          {/* 付箋作成フォーム */}
          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              placeholder="メモを入力..."
              value={newNoteContent}
              onChange={e => setNewNoteContent(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl border text-sm focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {['bg-yellow-100', 'bg-blue-100', 'bg-pink-100', 'bg-green-100'].map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setNewNoteColor(color)}
                    className={`w-6 h-6 rounded-full border ${color} ${newNoteColor === color ? 'ring-2 ring-amber-500' : ''}`}
                  />
                ))}
              </div>
              <button type="submit" className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700">
                付箋を貼る
              </button>
            </div>
          </form>

          {/* 付箋一覧 */}
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
            {notes.map(n => (
              <div key={n.id} className={`p-4 rounded-xl shadow-sm ${n.color} relative group border border-black/5 flex flex-col justify-between min-h-[100px]`}>
                <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">{n.content}</p>
                <button
                  onClick={() => handleDeleteNote(n.id)}
                  className="self-end text-slate-400 hover:text-red-600 text-xs mt-2"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}