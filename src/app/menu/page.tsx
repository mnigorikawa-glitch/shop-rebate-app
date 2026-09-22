'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MenuPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState<string>('');

  useEffect(() => {
    // ログイン画面で選択した店舗名を取得
    const savedStore = sessionStorage.getItem('selectedStore');
    if (!savedStore) {
      router.push('/'); // 未選択の場合はログイン画面に戻す
    } else {
      setStoreName(savedStore);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* ヘッダー情報 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">現在の選択店舗</span>
            <h1 className="text-xl font-bold text-slate-800">{storeName || '未選択'}</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg border border-slate-200"
          >
            店舗を変更する
          </button>
        </div>

        {/* メイン機能メニュー */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 機能1: 受領書作成 */}
          <button
            onClick={() => router.push('/receipt')}
            className="bg-white p-6 rounded-xl shadow-md border border-slate-200 text-left hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
              📝
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600">
              キャッシュバック受領書作成
            </h2>
            <p className="text-xs text-slate-500">
              即時（店頭現金）・後日（口座振込/ATM受取）の受領書を発行し、CELFへデータを保存します。
            </p>
          </button>

          {/* 機能2: PDFデータ検索 (準備中枠組み) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-left opacity-60 relative">
            <span className="absolute top-4 right-4 text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">
              今後実装予定
            </span>
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl mb-4 text-slate-400">
              🔍
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-1">
              発行済みPDFデータ検索
            </h2>
            <p className="text-xs text-slate-400">
              過去に発行した受領書データの確認やPDFの再出力を行います。
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}