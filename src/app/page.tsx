'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [storeList, setStoreList] = useState<any[]>([]);
  const [selectedStoreName, setSelectedStoreName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch('/api/celf/stores');
        const data = await res.json();
        if (data.success && Array.isArray(data.stores) && data.stores.length > 0) {
          // 出張所フラグが 1 以外の店舗を抽出
          const filtered = data.stores.filter((s: any) => Number(s.branchFlag) !== 1);
          setStoreList(filtered);
          if (filtered.length > 0) {
            setSelectedStoreName(filtered[0].storeName);
          }
        }
      } catch (err) {
        console.error('店舗情報の取得に失敗しました', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStores();
  }, []);

  const handleLogin = () => {
    if (!selectedStoreName) {
      alert('店舗を選択してください。');
      return;
    }
    const storeObj = storeList.find((s) => s.storeName === selectedStoreName);
    if (storeObj) {
      sessionStorage.setItem('selectedStoreObj', JSON.stringify(storeObj));
      sessionStorage.setItem('selectedStore', storeObj.storeName);
    }
    router.push('/menu');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        
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
                value={selectedStoreName}
                onChange={(e) => setSelectedStoreName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-base bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
              >
                {storeList.map((store) => (
                  <option key={store.storeName} value={store.storeName}>
                    {store.storeName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading || !selectedStoreName}
            className={`w-full py-3.5 rounded-lg text-white font-bold text-lg shadow-md transition-all ${
              isLoading || !selectedStoreName
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