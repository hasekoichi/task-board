'use client';

import { useState, useEffect } from 'react';
import { supabase, Task, MatrixType, StickyColor } from '@/lib/supabase';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2, Calendar as CalendarIcon, Move, LogOut, BookOpen, ChevronDown, Infinity as InfinityIcon } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const MATRIX_SECTIONS: { id: MatrixType; title: string; subtitle: string; bg: string; border: string }[] = [
  { id: 'do_first', title: '🔥 緊急 × 重要', subtitle: '今すぐやる（優先度：高）', bg: 'bg-red-50/50', border: 'border-red-200' },
  { id: 'schedule', title: '📅 非緊急 × 重要', subtitle: '計画的に進める（スケジュール）', bg: 'bg-blue-50/50', border: 'border-blue-200' },
  { id: 'delegate', title: '⚡ 緊急 × 非重要', subtitle: 'サクッと終わらせる（短時間）', bg: 'bg-amber-50/50', border: 'border-amber-200' },
  { id: 'dont_do', title: '🧹 非緊急 × 非重要', subtitle: '後回し・見直し（整理）', bg: 'bg-gray-50/50', border: 'border-gray-200' },
];

const COLOR_MAP: Record<StickyColor, { bg: string; border: string; badge: string; dot: string }> = {
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', badge: 'bg-yellow-200 text-yellow-900', dot: 'bg-amber-400' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-300', badge: 'bg-pink-200 text-pink-900', dot: 'bg-pink-400' },
  blue: { bg: 'bg-sky-100', border: 'border-sky-300', badge: 'bg-sky-200 text-sky-900', dot: 'bg-sky-400' },
  green: { bg: 'bg-emerald-100', border: 'border-emerald-300', badge: 'bg-emerald-200 text-emerald-900', dot: 'bg-emerald-400' },
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMatrix, setSelectedMatrix] = useState<MatrixType>('do_first');
  const [selectedColor, setSelectedColor] = useState<StickyColor>('yellow');
  const [dueDate, setDueDate] = useState('');
  const [isNoDeadline, setIsNoDeadline] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchTasks(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchTasks(currentUser.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTasks = async (userId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    const newTask = {
      user_id: user.id,
      title,
      subject: subject.trim() || null,
      description: description || null,
      is_completed: false,
      matrix_type: selectedMatrix,
      color: selectedColor,
      due_date: isNoDeadline ? null : dueDate || null,
    };

    const { data, error } = await supabase.from('tasks').insert([newTask]).select();

    if (error) {
      alert(`保存に失敗しました: ${error.message}`);
      return;
    }

    if (data) {
      setTasks([data[0], ...tasks]);
      setTitle('');
      setSubject('');
      setDescription('');
      setDueDate('');
      setIsNoDeadline(false);
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(tasks.filter((task) => task.id !== id));
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newMatrixType = destination.droppableId as MatrixType;

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === draggableId ? { ...t, matrix_type: newMatrixType } : t))
    );

    await supabase.from('tasks').update({ matrix_type: newMatrixType }).eq('id', draggableId);
  };

  const renderTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dateStr = date.toLocaleDateString('sv-SE');
    const dayTasks = tasks.filter((t) => t.due_date === dateStr);

    if (dayTasks.length === 0) return null;

    return (
      <div className="mt-0.5 flex flex-col gap-0.5 w-full text-left">
        {dayTasks.map((t) => (
          <div
            key={t.id}
            title={`${t.subject ? `[${t.subject}] ` : ''}${t.title}`}
            className={`w-full text-[10px] p-0.5 rounded font-bold text-slate-800 ${
              COLOR_MAP[t.color || 'yellow'].bg
            } border ${COLOR_MAP[t.color || 'yellow'].border} shadow-sm truncate`}
          >
            {t.title}
          </div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6 text-slate-800">📌 タスクボード</h1>
          {authError && <p className="text-red-500 text-sm mb-4 text-center">{authError}</p>}
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-base"
              required
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-base"
              required
            />
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition"
            >
              {isSignUp ? '新規登録' : 'ログイン'}
            </button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-sm text-slate-500 mt-4 underline"
          >
            {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントを作成する場合はこちら'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-4 md:p-8 space-y-6 md:space-y-8">
      {/* ヘッダー */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            📌 タスクボード
          </h1>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full truncate max-w-[200px]">
            {user.email}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium shrink-0"
          >
            <LogOut size={16} /> ログアウト
          </button>
        </div>
      </header>

      {/* メインの4象限ボード */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側: 新規付箋の作成フォーム */}
        <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={20} /> 新しい付箋を追加
          </h2>
          <form onSubmit={addTask} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">教科・科目名</label>
              <input
                type="text"
                placeholder="例: 数学Ⅰ、英語"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">課題・タスク名</label>
              <input
                type="text"
                placeholder="例: 期末レポート提出"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">メモ / 詳細</label>
              <textarea
                placeholder="例: 教科書P.45〜P.48"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none h-20 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">提出期限</label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isNoDeadline}
                    onChange={(e) => {
                      setIsNoDeadline(e.target.checked);
                      if (e.target.checked) setDueDate('');
                    }}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  無期限にする
                </label>
              </div>
              <input
                type="date"
                value={dueDate}
                disabled={isNoDeadline}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full p-2 text-sm border border-slate-300 rounded-lg outline-none transition ${
                  isNoDeadline ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">配置エリア</label>
              <select
                value={selectedMatrix}
                onChange={(e) => setSelectedMatrix(e.target.value as MatrixType)}
                className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none bg-white"
              >
                {MATRIX_SECTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">付箋の色</label>
              <div className="flex gap-2">
                {(['yellow', 'pink', 'blue', 'green'] as StickyColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition ${
                      selectedColor === c ? 'border-slate-800 scale-110' : 'border-transparent'
                    } ${COLOR_MAP[c].bg}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-3 rounded-xl transition shadow-md"
            >
              付箋を貼る
            </button>
          </form>
        </div>

        {/* 右側: 4象限マトリクスボード */}
        <div className="lg:col-span-3">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MATRIX_SECTIONS.map((section) => {
                const sectionTasks = tasks.filter((t) => t.matrix_type === section.id);

                return (
                  <Droppable key={section.id} droppableId={section.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`min-h-[260px] sm:min-h-[320px] p-3.5 sm:p-4 rounded-2xl border-2 ${section.border} ${
                          section.bg
                        } transition-colors ${snapshot.isDraggingOver ? 'ring-2 ring-amber-400 bg-amber-50/20' : ''}`}
                      >
                        <div className="mb-3">
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base">{section.title}</h3>
                          <p className="text-[11px] sm:text-xs text-slate-500">{section.subtitle}</p>
                        </div>

                        <div className="space-y-2.5 sm:space-y-3 min-h-[180px] sm:min-h-[220px]">
                          {sectionTasks.map((task, index) => {
                            const colorStyle = COLOR_MAP[task.color || 'yellow'];

                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={{ ...provided.draggableProps.style }}
                                    className={`p-3.5 sm:p-4 rounded-xl border ${colorStyle.border} ${colorStyle.bg} shadow-sm transition transform ${
                                      snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl z-50' : ''
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        {task.subject && (
                                          <span
                                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${colorStyle.badge}`}
                                          >
                                            <BookOpen size={10} />
                                            {task.subject}
                                          </span>
                                        )}
                                        <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">
                                          {task.title}
                                        </h4>
                                        {task.description && (
                                          <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap break-words">
                                            {task.description}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="p-1.5 text-slate-400 hover:text-slate-600 touch-none active:bg-black/5 rounded"
                                          title="長押し・ドラッグで移動"
                                        >
                                          <Move size={16} />
                                        </div>
                                        <button
                                          onClick={() => deleteTask(task.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 transition"
                                          title="削除"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-white/60 px-2 py-0.5 rounded w-fit">
                                      {task.due_date ? (
                                        <>
                                          <CalendarIcon size={12} />
                                          <span>締切: {task.due_date}</span>
                                        </>
                                      ) : (
                                        <>
                                          <InfinityIcon size={12} className="text-slate-500" />
                                          <span>無期限</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </div>
      {/* 下部エリア: カレンダービュー ＆ 直近2週間のタスク */}
      <section className="max-w-7xl mx-auto bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-amber-500" size={20} /> 課題スケジュール＆直近のタスク
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* 左半分: コンパクトな月間カレンダー */}
          <div className="bg-slate-50/50 p-2.5 sm:p-4 rounded-xl border border-slate-100 overflow-hidden">
            <Calendar
              tileContent={renderTileContent}
              locale="ja-JP"
              formatDay={(_locale, date) => date.getDate().toString()}
              prev2Label={null}
              next2Label={null}
            />
          </div>

          {/* 右半分: 直近2週間のタスク一覧 */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-200">
              ⏱️ 直近2週間のタスク
            </h3>

            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const twoWeeksLater = new Date();
              twoWeeksLater.setDate(today.getDate() + 14);
              twoWeeksLater.setHours(23, 59, 59, 999);

              const upcomingTasks = tasks
                .filter((t) => {
                  if (!t.due_date) return false;
                  const taskDate = new Date(t.due_date);
                  return taskDate >= today && taskDate <= twoWeeksLater;
                })
                .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

              if (upcomingTasks.length === 0) {
                return (
                  <div className="p-6 sm:p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    今後2週間に提出期限があるタスクはありません 🎉
                  </div>
                );
              }

              return (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {upcomingTasks.map((t) => {
                    const colorStyle = COLOR_MAP[t.color || 'yellow'];
                    return (
                      <div
                        key={t.id}
                        className={`p-3 sm:p-3.5 rounded-xl border ${colorStyle.border} ${colorStyle.bg} shadow-sm flex items-center justify-between gap-3`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {t.subject && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorStyle.badge}`}>
                                {t.subject}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                              <CalendarIcon size={12} />
                              {t.due_date}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm truncate">{t.title}</h4>
                          {t.description && (
                            <p className="text-xs text-slate-600 truncate mt-0.5">{t.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => deleteTask(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition shrink-0"
                          title="削除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </section>
    </main>
  );
}