'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// API接続失敗時のデフォルト店舗リスト
const DEFAULT_STORES = [
  'au Style イオンモールつくば',
  'au Style イオンモール土浦',
  'auショップ 水戸南',
  'auショップ つくば研究学園',
];

export default function LoginPage() {
  const router = useRouter();
  const [stores, setStores] = useState<string[]>(DEFAULT_STORES);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // CELFから店舗データベースを取得
  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch('/api/celf/stores');
        const data = await res.json();
        if (data.success && Array.isArray(data.stores) && data.stores.length > 0) {
          setStores(data.stores);
          setSelectedStore(data.stores[0]);
        } else {
          setSelectedStore(DEFAULT_STORES[0]);
        }
      } catch (err) {
        console.error('店舗情報の取得に失敗しました', err);
        setSelectedStore(DEFAULT_STORES[0]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStores();
  }, []);

  const handleLogin = () => {
    if (!selectedStore) {
      alert('店舗を選択してください。');
      return;
    }
    // 選択された店舗名をブラウザに一時保存
    sessionStorage.setItem('selectedStore', selectedStore);
    // メインメニュー画面へ遷移
    router.push('/menu');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        
        {/* タイトルロゴエリア */}
        <div className="text-center mb-8">
          <span className="inline-block bg-orange-100 text-orange-600 font-bold text-xs px-3 py-1 rounded-full mb-2">
            田中電子 業務システム
          </span>
          <h1 className="text-2xl font-bold text-slate-800">
            キャッシュバック受領書<br />発行システム
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            利用を開始するには、所属店舗を選択してください。
          </p>
        </div>

        {/* 店舗選択フォーム */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              店舗選択 *
            </label>
            {isLoading ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-sm text-slate-400">
                店舗マスタ（CELF）読み込み中...
              </div>
            ) : (
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-base bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
              >
                {stores.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ログインボタン */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading || !selectedStore}
            className={`w-full py-3.5 rounded-lg text-white font-bold text-lg shadow-md transition-all ${
              isLoading || !selectedStore
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-900 active:scale-[0.99]'
            }`}
          >
            メインメニューへ進む →
          </button>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            © Tanaka Electronics Co., Ltd. All Rights Reserved.
          </p>
        </div>

      </div>
    </div>
  );
}