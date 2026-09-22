'use client';

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'site_auth_status';

export function AccessGuard({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      // 1. 检查 URL 是否带了 ?key=xxx
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('key');

      if (urlKey) {
        const ok = await verifyWithServer(urlKey);
        if (ok && isMounted) {
          localStorage.setItem(STORAGE_KEY, 'unlocked');
          // 移除地址栏中的 key 参数，避免明文留在历史记录或分享链接中
          params.delete('key');
          const newSearch = params.toString() ? `?${params.toString()}` : '';
          window.history.replaceState({}, '', `${window.location.pathname}${newSearch}`);
          setUnlocked(true);
          return;
        }
      }

      // 2. 检查本地是否有解锁标记或 Cookie
      const isLocalUnlocked = localStorage.getItem(STORAGE_KEY) === 'unlocked';
      const hasCookie = document.cookie.includes('site_auth=');

      if (isLocalUnlocked || hasCookie) {
        if (isMounted) setUnlocked(true);
        return;
      }

      // 3. 探测服务端是否配置了 ACCESS_KEY（若未配置环境变量则自动免密放行）
      const serverCheck = await verifyWithServer('');
      if (isMounted) {
        if (serverCheck) {
          setUnlocked(true);
        } else {
          setUnlocked(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  async function verifyWithServer(key: string): Promise<boolean> {
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!keyInput.trim()) {
      setErrorMsg('请输入访问密钥');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const ok = await verifyWithServer(keyInput.trim());
    setLoading(false);

    if (ok) {
      localStorage.setItem(STORAGE_KEY, 'unlocked');
      setUnlocked(true);
    } else {
      setErrorMsg('访问密钥错误，请重新输入');
    }
  }

  // 初始化检查中：全屏深色防闪烁
  if (unlocked === null) {
    return <div className="fixed inset-0 z-[9999] bg-[#0d1017]" />;
  }

  // 已解锁：直接放行渲染全站
  if (unlocked) {
    return <>{children}</>;
  }

  // 未解锁：呈现沉浸式暗黑像素风锁屏遮罩
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d1017]/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-lg border border-[#3b4b6b]/40 bg-[#151b28] p-6 text-slate-200 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-[#e9a663]/40 bg-[#e9a663]/10 text-2xl shadow-inner">
            🔐
          </div>
          <h2 className="text-base font-bold tracking-wider text-[#e9a663]" style={{ fontFamily: 'var(--font-pixel)' }}>
            AI 大模型世界
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">本站已启用访问权限保护，请输入口令进入</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="请输入访问口令"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full rounded border border-slate-700 bg-[#0d1017] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-[#e9a663] focus:outline-none"
              autoFocus
            />
            {errorMsg && <p className="mt-2 text-xs text-rose-400">⚠️ {errorMsg}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded border border-[#e9a663] bg-[#e9a663]/20 py-2.5 text-sm font-semibold text-[#e9a663] transition-all hover:bg-[#e9a663]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            {loading ? '正在验证...' : '进入世界 ➔'}
          </button>
        </form>
      </div>
    </div>
  );
}
