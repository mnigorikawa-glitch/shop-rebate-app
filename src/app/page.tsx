'use client';

import React, { useState, useRef, useEffect } from 'react';

// CELFマスタ取得失敗時のフォールバックデータ
const DEFAULT_REDUCTION_MASTER = [
  { 表記名: 'auUQ_SIM単体MNP', 還元基準額: 20000, セット割対応: 'false' },
  { 表記名: '自宅セット割(ネットコース)', 還元基準額: 5000, セット割対応: 'true' },
  { 表記名: '自宅セット割(でんきコース)', 還元基準額: 5000, セット割対応: 'true' },
  { 表記名: 'auPAYゴールドカード', 還元基準額: 5000, セット割対応: 'false' },
  { 表記名: '当日特典キャッシュバック', 還元基準額: 5000, セット割対応: 'false' },
  { 表記名: 'その他（手入力）', 還元基準額: 0, セット割対応: 'false' },
];

export default function Home() {
  const [mode, setMode] = useState<'即時' | '後日'>('即時');

  // マスタデータ
  const [reductionMaster, setReductionMaster] = useState(DEFAULT_REDUCTION_MASTER);

  // 基本情報
  const [storeName, setStoreName] = useState('au Style イオンモールつくば');
  const [remittanceMethod, setRemittanceMethod] = useState<'口座振替' | 'ATM受取'>('口座振替'); // 還元方法（後日CB用）
  const [staffName, setStaffName] = useState('');
  const [checkerName, setCheckerName] = useState('');
  const [counterNo, setCounterNo] = useState('1');
  const [posBillNo, setPosBillNo] = useState('');

  // 還元内訳（申込書番号を各行に配置）
  const [items, setItems] = useState<Array<{
    type: string;
    customType: string;
    appNo: string;
    isExisting: boolean;
    existingPlan: string;
    subAppNo: string;
    amount: string;
  }>>([
    {
      type: 'auUQ_SIM単体MNP',
      customType: '',
      appNo: '',
      isExisting: false,
      existingPlan: '既存+トクトク2',
      subAppNo: '',
      amount: '20000',
    },
  ]);

  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // --- Canvas制御 ---
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
      if (canvas) setSignatureData(canvas.toDataURL());
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

  // --- 内訳操作 ---
  const addItem = () => {
    const defaultMaster = reductionMaster[0];
    setItems([
      ...items,
      {
        type: defaultMaster.表記名,
        customType: '',
        appNo: '',
        isExisting: false,
        existingPlan: '既存+トクトク2',
        subAppNo: '',
        amount: String(defaultMaster.還元基準額),
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'type') {
      const master = reductionMaster.find((m) => m.表記名 === value);
      if (master) {
        newItems[index].amount = String(master.還元基準額);
        if (String(master.セット割対応) !== 'true') {
          newItems[index].isExisting = false;
          newItems[index].subAppNo = '';
        }
      }
    }

    setItems(newItems);
  };

  const isSetDiscountSupported = (typeName: string) => {
    const master = reductionMaster.find((m) => m.表記名 === typeName);
    return master ? String(master.セット割対応) === 'true' : false;
  };

  // --- 送信処理 ---
  const handleSubmit = async () => {
    if (!staffName) return alert('担当者名を入力してください。');
    if (mode === '即時' && !posBillNo) return alert('POS業務伝票番号を入力してください。');
    if (items.some((item) => !item.appNo)) return alert('全ての還元内訳に申込書番号を入力してください。');
    if (!signatureData) return alert('お客様署名（サイン）をお願いいたします。');

    setIsSending(true);

    try {
      const formattedItems = items.map((item) => {
        let finalSubAppNo = '';
        if (isSetDiscountSupported(item.type)) {
          finalSubAppNo = item.isExisting ? item.existingPlan : item.subAppNo;
        }

        return {
          type: item.type === 'その他（手入力）' ? item.customType : item.type,
          appNo: item.appNo,
          subAppNo: finalSubAppNo,
          amount: Number(item.amount) || 0,
        };
      });

      const payload = {
        mode,
        storeName,
        remittanceMethod: mode === '後日' ? remittanceMethod : '', // 還元方法を送信
        staffName,
        checkerName,
        counterNo: mode === '即時' ? counterNo : '',
        posBillNo: mode === '即時' ? posBillNo : '',
        totalAmount,
        items: formattedItems,
      };

      const res = await fetch('/api/celf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || '送信失敗');

      alert(`受領書を保存しました。 (振込No: ${data.transferNo || '即時処理'})`);
      window.print();
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6 print:shadow-none print:p-0">
        
        {/* ヘッダー */}
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

        {/* 1. 基本情報 */}
        <div className="space-y-4 mb-6">
          <h2 className="text-md font-bold text-slate-700 border-l-4 border-slate-700 pl-2 print:hidden">1. 基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* モードに応じた第1項目の切り替え */}
            {mode === '即時' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">店舗名</label>
                <input
                  type="text"
                  value={storeName}
                  disabled
                  className="w-full border border-slate-200 bg-slate-100 rounded p-2 text-sm font-semibold text-slate-700"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">還元方法 *</label>
                <select
                  value={remittanceMethod}
                  onChange={(e) => setRemittanceMethod(e.target.value as '口座振替' | 'ATM受取')}
                  className="w-full border border-blue-400 bg-blue-50 rounded p-2 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="口座振替">口座振替</option>
                  <option value="ATM受取">ATM受取</option>
                </select>
              </div>
            )}

            {mode === '即時' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">POS業務伝票番号 *</label>
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
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">振込No (自動採番)</label>
                <input
                  type="text"
                  value="送信時に自動採番 (YYMM-通番)"
                  disabled
                  className="w-full border border-slate-200 bg-slate-100 rounded p-2 text-sm text-slate-500 italic"
                />
              </div>
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

          <div className="space-y-4">
            {items.map((item, index) => {
              const setSupported = isSetDiscountSupported(item.type);

              return (
                <div key={index} className="p-3 bg-slate-50 border rounded-lg space-y-3 print:bg-white print:p-1">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                    
                    {/* 還元内容 */}
                    <div className="md:col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">還元内容 *</label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(index, 'type', e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 text-sm bg-white"
                      >
                        {reductionMaster.map((m) => (
                          <option key={m.表記名} value={m.表記名}>{m.表記名}</option>
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

                    {/* 申込書番号 */}
                    <div className="md:col-span-3">
                      <label className="block text-xs text-slate-500 mb-1">申込書番号 *</label>
                      <input
                        type="text"
                        placeholder="例: EAD123456"
                        value={item.appNo}
                        onChange={(e) => updateItem(index, 'appNo', e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 text-sm font-mono"
                      />
                    </div>

                    {/* セット割申番 & 既存ボタン */}
                    <div className="md:col-span-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className={`text-xs ${setSupported ? 'text-slate-500' : 'text-slate-300'}`}>
                          セット割申番
                        </label>
                        {setSupported && (
                          <button
                            type="button"
                            onClick={() => updateItem(index, 'isExisting', !item.isExisting)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                              item.isExisting
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            既存
                          </button>
                        )}
                      </div>

                      {setSupported ? (
                        item.isExisting ? (
                          <select
                            value={item.existingPlan}
                            onChange={(e) => updateItem(index, 'existingPlan', e.target.value)}
                            className="w-full border border-orange-400 bg-orange-50 rounded p-1.5 text-sm font-semibold text-orange-900"
                          >
                            <option value="既存+トクトク2">既存+トクトク2</option>
                            <option value="既存+コミコミバリュー">既存+コミコミバリュー</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="例: EQ123456"
                            value={item.subAppNo}
                            onChange={(e) => updateItem(index, 'subAppNo', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1.5 text-sm font-mono bg-white"
                          />
                        )
                      ) : (
                        <input
                          type="text"
                          disabled
                          placeholder="対象外"
                          className="w-full border border-slate-200 bg-slate-100 rounded p-1.5 text-sm text-slate-400 cursor-not-allowed"
                        />
                      )}
                    </div>

                    {/* 金額 */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-500">金額 (円)</label>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 text-xs font-bold hover:underline print:hidden"
                          >
                            削除
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 text-sm text-right font-mono"
                      />
                    </div>

                  </div>
                </div>
              );
            })}
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