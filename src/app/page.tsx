'use client';

import React, { useState, useRef } from 'react';

interface RebateItem {
  id: string;
  type: string;
  amount: string;
  method: string;
  slipNumber: string;
}

export default function Home() {
  const [customerName, setCustomerName] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [staffName, setStaffName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [items, setItems] = useState<RebateItem[]>([
    { id: '1', type: '独自特典キャッシュバック', amount: '', method: '店頭お渡し', slipNumber: '' },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), type: '独自特典キャッシュバック', amount: '', method: '店頭お渡し', slipNumber: '' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RebateItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // サイン描画機能
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert('注意事項への同意（チェック）が必要です。');
      return;
    }
    alert('受領書データを発行しました。（後ほどCELF自動送信・印刷機能を接続します）');
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
        <header className="border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900 text-center">独自特典還元 受領書作成</h1>
          <p className="text-sm text-slate-500 text-center mt-1">au Style イオンモールつくば / TNK帳票DX</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報入力 */}
          <section className="bg-slate-50 p-4 rounded-xl space-y-4">
            <h2 className="font-bold text-slate-700">1. 基本情報入力</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">申込書番号 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: A12345678"
                  value={applicationNumber}
                  onChange={(e) => setApplicationNumber(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">お客様氏名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: 田中 太郎 様"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
            </div>
          </section>

          {/* 還元内訳（複数追加可） */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-700">2. 還元内容内訳</h2>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 text-sm"
              >
                ＋ 特典項目を追加
              </button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white shadow-sm">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs font-bold text-slate-400">項目 {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">還元内容</label>
                    <input
                      type="text"
                      value={item.type}
                      onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                      className="w-full p-2 border rounded-lg bg-slate-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">還元額 (円) *</label>
                    <input
                      type="number"
                      required
                      placeholder="5000"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                      className="w-full p-2 border rounded-lg text-lg font-semibold text-blue-600"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="p-4 bg-blue-50 rounded-xl flex justify-between items-center">
              <span className="font-bold text-slate-700">還元額 合計</span>
              <span className="text-2xl font-black text-blue-600">¥ {totalAmount.toLocaleString()}</span>
            </div>
          </section>

          {/* 免責確認 */}
          <section className="p-4 border border-amber-200 bg-amber-50 rounded-xl space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-amber-900">
                上記の内容（還元金額・お渡し/振込方法）に誤りがないことを確認し、受領にあたっての注意事項に同意します。
              </span>
            </label>
          </section>

          {/* 手書きサイン */}
          <section className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-700">3. お客様ご署名</h2>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-slate-500 underline hover:text-slate-700"
              >
                書き直す
              </button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 touch-none cursor-crosshair bg-white"
              />
            </div>
          </section>

          {/* 担当者名 */}
          <section>
            <label className="block text-xs font-semibold text-slate-600 mb-1">担当スタッフ名 *</label>
            <input
              type="text"
              required
              placeholder="例: 佐藤"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </section>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            受領書を発行・保存する
          </button>
        </form>
      </div>
    </main>
  );
}