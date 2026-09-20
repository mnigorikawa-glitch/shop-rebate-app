'use client';

import React, { useState, useRef } from 'react';

interface RebateItem {
  id: string;
  type: string;
  amount: string;
}

export default function Home() {
  const [customerName, setCustomerName] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [staffName, setStaffName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [issueDate] = useState(() => new Date().toLocaleDateString('ja-JP'));

  const [items, setItems] = useState<RebateItem[]>([
    { id: '1', type: '独自特典キャッシュバック', amount: '5000' },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), type: '独自特典キャッシュバック', amount: '' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RebateItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
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

    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6 print:shadow-none print:p-0 print:max-w-full">
        <header className="border-b pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">特典還元 兼 キャッシュバック受領書</h1>
            <p className="text-sm text-slate-500 mt-1">au Style イオンモールつくば</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>発行日: {issueDate}</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-slate-50 p-4 rounded-xl space-y-4 print:bg-transparent print:p-0 print:border-b print:pb-4">
            <h2 className="font-bold text-slate-700 print:text-base">1. 基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">申込書番号 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: A12345678"
                  value={applicationNumber}
                  onChange={(e) => setApplicationNumber(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white print:border-none print:p-0 print:text-base"
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
                  className="w-full p-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white print:border-none print:p-0 print:text-base"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="font-bold text-slate-700">2. 還元内容内訳</h2>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 text-sm"
              >
                ＋ 特典項目を追加
              </button>
            </div>

            <h2 className="font-bold text-slate-700 hidden print:block">2. 還元内容内訳</h2>

            {items.map((item, index) => (
              <div key={item.id} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white shadow-sm print:shadow-none print:border-b print:rounded-none">
                <div className="flex justify-between items-center border-b pb-2 print:hidden">
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
                      className="w-full p-2 border rounded-lg bg-slate-50 text-sm print:bg-transparent print:border-none print:p-0"
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
                      className="w-full p-2 border rounded-lg text-lg font-semibold text-blue-600 print:text-black print:border-none print:p-0"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="p-4 bg-blue-50 rounded-xl flex justify-between items-center print:bg-transparent print:border-t-2 print:border-black">
              <span className="font-bold text-slate-700">受領金額 合計</span>
              <span className="text-2xl font-black text-blue-600 print:text-black">¥ {totalAmount.toLocaleString()}</span>
            </div>
          </section>

          <section className="p-4 border border-amber-200 bg-amber-50 rounded-xl space-y-2 print:border-none print:bg-transparent print:p-0">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500 print:hidden"
              />
              <span className="text-sm text-amber-900 print:text-xs print:text-slate-600">
                上記の内容（還元金額・お渡し/振込方法）に誤りがないことを確認し、受領にあたっての注意事項に同意します。
              </span>
            </label>
          </section>

          <section className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-700">3. お客様ご署名</h2>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-slate-500 underline hover:text-slate-700 print:hidden"
              >
                書き直す
              </button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden print:border-solid print:border-slate-400">
              <canvas
                ref={canvasRef}
                width={600}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 touch-none cursor-crosshair bg-white"
              />
            </div>
          </section>

          <section>
            <label className="block text-xs font-semibold text-slate-600 mb-1">担当スタッフ名 *</label>
            <input
              type="text"
              required
              placeholder="例: 佐藤"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white print:border-none print:p-0"
            />
          </section>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.99] print:hidden"
          >
            受領書を発行・印刷する
          </button>
        </form>
      </div>
    </main>
  );
}