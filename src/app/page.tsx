'use client';

import React, { useState, useRef, useEffect } from 'react';

// よく使われる還元内容の選択肢リスト
const REDUCTION_TYPES = [
  'auUQ_SIM単体MNP',
  '自宅セット割(ネットコース)',
  '自宅セット割(でんき)',
  'auPAYゴールドカード',
  '当日特典キャッシュバック',
  'その他（手入力）',
];

export default function Home() {
  // モード選択 ('即時' | '後日')
  const [mode, setMode] = useState<'即時' | '後日'>('即時');

  // 基本情報
  const [storeName, setStoreName] = useState('au Style イオンモールつくば');
  const [staffName, setStaffName] = useState('');
  const [checkerName, setCheckerName] = useState('');
  const [counterNo, setCounterNo] = useState('1');
  const [posBillNo, setPosBillNo] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');

  // 還元内訳（複数追加対応）
  const [items, setItems] = useState<Array<{ type: string; customType: string; subAppNo: string; amount: string }>>([
    { type: 'auUQ_SIM単体MNP', customType: '', subAppNo: '', amount: '' },
  ]);

  // 免責チェック & サイン
  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Canvas関連
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // 金額合計
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // --- Canvas制御 (手書きサイン) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  }, [mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureData(canvas.toDataURL());
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setSignatureData(null);
  };

  // --- 還元内訳の追加 / 削除 / 変更 ---
  const addItem = () => {
    setItems([...items, { type: 'auUQ_SIM単体MNP', customType: '', subAppNo: '', amount: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // 既存回線用入力補完
  const appendExistingPrefix = (index: number, prefix: string) => {
    const currentVal = items[index].subAppNo;
    if (!currentVal.startsWith('既存')) {
      updateItem(index, 'subAppNo', `既存${prefix}${currentVal}`);
    }
  };

  // --- 送信 & 印刷処理 ---
  const handleSubmit = async () => {
    if (!staffName) {
      alert('担当スタッフ名を入力してください。');
      return;
    }
    if (!applicationNumber) {
      alert('申込書番号を入力してください。');
      return;
    }
    if (!signatureData) {
      alert('お客様署名（サイン）をお願いいたします。');
      return;
    }

    setIsSending(true);

    try {
      const payload = {
        mode,
        storeName,
        staffName,
        checkerName,
        counterNo: mode === '即時' ? counterNo : '',
        posBillNo: mode === '即時' ? posBillNo : '',
        applicationNumber,
        totalAmount,
        items: items.map(item => ({
          type: item.type === 'その他（手入力）' ? item.customType : item.type,
          subAppNo: item.subAppNo,
          amount: Number(item.amount) || 0,
        })),
      };

      const res = await fetch('/api/celf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'CELFへのデータ送信に失敗しました。');
      }

      // 送信成功後に印刷ダイアログを起動
      window.print();
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6 print:shadow-none print:p-0">
        
        {/* ヘッダー & モード切り替え */}
        <div className="border-b pb-4 mb-6 print:hidden">
          <h1 className="text-xl font-bold text-slate-800 text-center mb-4">キャッシュバック受領書 作成</h1>
          <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('即時')}
              className={`py-2 text-sm font-bold rounded-md transition-all ${
                mode === '即時' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ 即時キャッシュバック (店頭現金)
            </button>
            <button
              type="button"
              onClick={() => setMode('後日')}
              className={`py-2 text-sm font-bold rounded-md transition-all ${
                mode === '後日' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 後日キャッシュバック (口座振込)
            </button>
          </div>
        </div>

        {/* 印刷用タイトル */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold border-b-2 border-black pb-2">
            キャッシュバック受領書 ({mode})
          </h1>
        </div>

        {/* 1. 基本情報 */}
        <div className="space-y-4 mb-6">
          <h2 className="text-md font-bold text-slate-700 border-l-4 border-slate-700 pl-2 print:hidden">1. 基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">店舗名</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">申込書番号 *</label>
              <input
                type="text"
                placeholder="例: EAD123456"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
              />
            </div>

            {mode === '即時' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">POS業務伝票番号</label>
                  <input
                    type="text"
                    placeholder="例: A01234567"
                    value={posBillNo}
                    onChange={(e) => setPosBillNo(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">お渡しカウンター</label>
                  <select
                    value={counterNo}
                    onChange={(e) => setCounterNo(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                  >
                    <option value="1">1番カウンター</option>
                    <option value="2">2番カウンター</option>
                    <option value="3">3番カウンター</option>
                    <option value="イベント特設">イベント特設</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">担当者（出金/入力者） *</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Wチェック者</label>
              <input
                type="text"
                value={checkerName}
                onChange={(e) => setCheckerName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. 還元内容内訳 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 print:hidden">
            <h2 className="text-md font-bold text-slate-700 border-l-4 border-slate-700 pl-2">2. 還元内容内訳</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700"
            >
              + 内訳を追加
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="p-3 bg-slate-50 border rounded-lg space-y-2 print:bg-white print:border-b print:p-1">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-xs text-slate-500 print:hidden">還元内容</label>
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(index, 'type', e.target.value)}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm bg-white"
                    >
                      {REDUCTION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {item.type === 'その他（手入力）' && (
                      <input
                        type="text"
                        placeholder="還元内容を入力"
                        value={item.customType}
                        onChange={(e) => updateItem(index, 'customType', e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 text-sm mt-1"
                      />
                    )}
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs text-slate-500 print:hidden">セット割申番 (グループ登録)</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="例: EQ123456"
                        value={item.subAppNo}
                        onChange={(e) => updateItem(index, 'subAppNo', e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => appendExistingPrefix(index, 'au')}
                        className="text-[10px] bg-slate-200 px-1.5 rounded whitespace-nowrap hover:bg-slate-300 print:hidden"
                      >
                        既存au
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 print:hidden">金額 (円)</label>
                    <input
                      type="number"
                      placeholder="5000"
                      value={item.amount}
                      onChange={(e) => updateItem(index, 'amount', e.target.value)}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm text-right font-mono"
                    />
                  </div>

                  {items.length > 1 && (
                    <div className="md:col-span-1 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 text-xs font-bold p-1 hover:bg-red-50 rounded"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg mt-3 print:bg-white print:border-t">
            <span className="font-bold text-slate-700">合計金額</span>
            <span className="text-xl font-bold text-blue-700 font-mono">
              ¥ {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 3. 同意事項 & 電子サイン */}
        <div className="mb-6">
          <label className="flex items-start gap-2 mb-3 cursor-pointer print:hidden">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-xs text-slate-600">
              {mode === '即時'
                ? '上記内容（受領金額・お渡し方法）に誤りがないことを確認し、現金を受領いたしました。'
                : '上記内容にて後日口座振込による還元手続きを申請・同意いたします。'}
            </span>
          </label>

          <div className="print:block text-xs text-slate-600 mb-2 hidden">
            【受領確認】{mode === '即時' ? '上記金額を本日現金にて確かに受領いたしました。' : '上記内容にて後日口座振込による還元手続きを承りました。'}
          </div>

          <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 relative print:bg-white">
            <div className="flex justify-between text-xs text-slate-500 mb-1 print:hidden">
              <span>お客様署名欄 (枠内に手書き)</span>
              <button type="button" onClick={clearCanvas} className="text-slate-500 underline">
                クリア
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={500}
              height={120}
              className="w-full bg-white border border-dashed border-slate-300 rounded touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={draw}
            />
          </div>
        </div>

        {/* 4. アクションボタン */}
        <div className="print:hidden">
          <button
            type="button"
            disabled={!agreed || isSending}
            onClick={handleSubmit}
            className={`w-full py-3.5 rounded-lg text-white font-bold transition-all shadow-md ${
              agreed && !isSending
                ? mode === '即時'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {isSending ? 'CELF連携中...' : '受領書を発行・印刷する'}
          </button>
        </div>

      </div>
    </div>
  );
}