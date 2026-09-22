'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_REDUCTION_MASTER = [
  { 表記名: 'auUQ_SIM単体MNP', 還元基準額: 20000, セット割対応: 'false' },
  { 表記名: '自宅セット割(ネットコース)', 還元基準額: 5000, セット割対応: 'true' },
  { 表記名: '自宅セット割(でんきコース)', 還元基準額: 5000, セット割対応: 'true' },
  { 表記名: 'auPAYゴールドカード', 還元基準額: 5000, セット割対応: 'false' },
  { 表記名: '当日特典キャッシュバック', 還元基準額: 5000, セット割対応: 'false' },
  { 表記名: 'その他（手入力）', 還元基準額: 0, セット割対応: 'false' },
];

export default function ReceiptPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'即時' | '後日'>('即時');

  // 店舗情報
  const [storeName, setStoreName] = useState('au Style イオンモールつくば');
  const [storeInfo, setStoreInfo] = useState<any>({});

  // CELF「還元内容」マスタ
  const [reductionMaster, setReductionMaster] = useState<any[]>(DEFAULT_REDUCTION_MASTER);

  useEffect(() => {
    const savedStoreObjStr = sessionStorage.getItem('selectedStoreObj');
    if (savedStoreObjStr) {
      try {
        const obj = JSON.parse(savedStoreObjStr);
        setStoreInfo(obj);
        setStoreName(obj.storeName);
      } catch (e) {}
    } else {
      const savedStore = sessionStorage.getItem('selectedStore');
      if (savedStore) setStoreName(savedStore);
    }

    async function fetchReductions() {
      try {
        const res = await fetch('/api/celf/reductions');
        const data = await res.json();
        if (data.success && Array.isArray(data.reductions) && data.reductions.length > 0) {
          setReductionMaster(data.reductions);
        }
      } catch (err) {
        console.error('還元内容マスタの取得に失敗しました', err);
      }
    }
    fetchReductions();
  }, []);

  // 追加フォーム項目（基本情報一番上）
  const [customerName, setCustomerName] = useState('');
  const [posDate, setPosDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // 基本情報
  const [remittanceMethod, setRemittanceMethod] = useState<'口座振替' | 'ATM受取'>('口座振替');
  const [staffName, setStaffName] = useState('');
  const [checkerName, setCheckerName] = useState('');
  const [counterNo, setCounterNo] = useState('1');
  const [posBillNo, setPosBillNo] = useState('');

  // 還元内訳
  const [items, setItems] = useState<Array<{
    type: string;
    customType: string;
    isExisting: boolean;
    existingPlan: string;
    appNo: string;
    subAppNo: string;
    amount: string;
  }>>([
    {
      type: 'auUQ_SIM単体MNP',
      customType: '',
      isExisting: false,
      existingPlan: '既存+トクトク2',
      appNo: '',
      subAppNo: '',
      amount: '20000',
    },
  ]);

  // 備考欄（フォーム最下部）
  const [memo, setMemo] = useState('');

  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const isSetDiscountSupported = (typeName: string) => {
    const master = reductionMaster.find(
      (m) => (m.表記名 || m.還元項目) === typeName
    );
    return master ? String(master.セット割対応) === 'true' : false;
  };

  // 一覧集計（同一項目合算）
  const aggregatedSummary = useMemo(() => {
    const map = new Map<string, { typeName: string; unitPrice: number; count: number; total: number }>();

    items.forEach((item) => {
      const typeName = item.type === 'その他（手入力）' ? (item.customType || 'その他') : item.type;
      const unitPrice = Number(item.amount) || 0;

      if (map.has(typeName)) {
        const current = map.get(typeName)!;
        current.count += 1;
        current.total += unitPrice;
      } else {
        map.set(typeName, {
          typeName,
          unitPrice,
          count: 1,
          total: unitPrice,
        });
      }
    });

    return Array.from(map.values());
  }, [items]);

  const totalAmount = useMemo(() => {
    return aggregatedSummary.reduce((sum, item) => sum + item.total, 0);
  }, [aggregatedSummary]);

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

  const addItem = () => {
    const defaultMaster = reductionMaster[0] || {};
    setItems([
      ...items,
      {
        type: defaultMaster.表記名 || defaultMaster.還元項目 || 'auUQ_SIM単体MNP',
        customType: '',
        isExisting: false,
        existingPlan: '既存+トクトク2',
        appNo: '',
        subAppNo: '',
        amount: String(defaultMaster.還元基準額 ?? 20000),
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
      const master = reductionMaster.find(
        (m) => (m.表記名 || m.還元項目) === value
      );
      if (master) {
        newItems[index].amount = String(master.還元基準額 ?? 0);
        if (String(master.セット割対応) !== 'true') {
          newItems[index].isExisting = false;
          newItems[index].subAppNo = '';
        }
      }
    }

    setItems(newItems);
  };

  // --- 送信処理 ---
  const handleSubmit = async () => {
    if (!staffName) return alert('担当者名を入力してください。');
    if (mode === '即時' && !posBillNo) return alert('POS業務伝票番号を入力してください。');
    if (items.some((item) => !item.isExisting && !item.appNo))
      return alert('全ての還元内訳に申込書番号を入力（または既存を選択）してください。');
    if (!signatureData) return alert('お客様署名（サイン）をお願いいたします。');

    setIsSending(true);

    try {
      const formattedItems = items.map((item) => {
        const finalAppNo = item.isExisting ? item.existingPlan : item.appNo;

        return {
          type: item.type === 'その他（手入力）' ? item.customType : item.type,
          appNo: finalAppNo,
          subAppNo: isSetDiscountSupported(item.type) ? item.subAppNo : '',
          amount: Number(item.amount) || 0,
        };
      });

      const formattedPosDate = posDate ? posDate.replace(/-/g, '/') : '';

      const payload = {
        mode,
        storeName,
        agentCode: storeInfo.agentCode || '',
        posAbbr: storeInfo.posAbbr || '',
        deptCode: storeInfo.deptCode || '',
        customerName,
        posDate: formattedPosDate,
        memo,
        remittanceMethod: mode === '後日' ? remittanceMethod : '',
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
      if (!data.success) {
        const errDetail = data.celfResponse 
          ? JSON.stringify(data.celfResponse) 
          : (data.error || '不明なエラーが発生しました');
        throw new Error(`CELF連携失敗 (Status: ${data.httpStatus || 'unknown'}): ${errDetail}`);
      }

      alert(`受領書を保存しました。 (振込No: ${data.data?.transferNo || '即時処理'})`);
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
        <div className="border-b pb-4 mb-6 flex justify-between items-center print:hidden">
          <div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded border border-orange-200">
              {storeName}
            </span>
            <h1 className="text-xl font-bold text-slate-800 mt-2">キャッシュバック受領書 作成</h1>
          </div>
          <button
            onClick={() => router.push('/menu')}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg border border-slate-200"
          >
            ← メニューへ戻る
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1 rounded-lg mb-6 print:hidden">
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
            📅 後日キャッシュバック (口座振込/ATM受取)
          </button>
        </div>

        {/* 1. 基本情報 */}
        <div className="space-y-4 mb-6">
          <h2 className="text-md font-bold text-slate-700 border-l-4 border-slate-700 pl-2 print:hidden">1. 基本情報</h2>
          
          {/* お客様名 & 日付欄 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">お客様名 (印刷用お宛名)</label>
              <input
                type="text"
                placeholder="例: 田中 太郎 様"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">日付 (POS登録日) *</label>
              <input
                type="date"
                value={posDate}
                onChange={(e) => setPosDate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
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

        {/* 2. 還元内容内訳フォーム */}
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

          <div className="space-y-4 print:hidden">
            {items.map((item, index) => {
              const setSupported = isSetDiscountSupported(item.type);

              return (
                <div key={index} className="p-3 bg-slate-50 border rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                    
                    <div className="md:col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">還元内容 *</label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(index, 'type', e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 text-sm bg-white"
                      >
                        {reductionMaster.map((m) => {
                          const name = m.表記名 || m.還元項目;
                          return <option key={name} value={name}>{name}</option>;
                        })}
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

                    <div className="md:col-span-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-500">申込書番号 *</label>
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

                      {setSupported && item.isExisting ? (
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
                          placeholder="例: EAD123456"
                          value={item.appNo}
                          onChange={(e) => updateItem(index, 'appNo', e.target.value)}
                          className="w-full border border-slate-300 rounded p-1.5 text-sm font-mono bg-white"
                        />
                      )}
                    </div>

                    <div className="md:col-span-3">
                      <label className={`block text-xs mb-1 ${setSupported ? 'text-slate-500' : 'text-slate-300'}`}>
                        セット割申番
                      </label>
                      {setSupported ? (
                        <input
                          type="text"
                          placeholder="例: EQ123456"
                          value={item.subAppNo}
                          onChange={(e) => updateItem(index, 'subAppNo', e.target.value)}
                          className="w-full border border-slate-300 rounded p-1.5 text-sm font-mono bg-white"
                        />
                      ) : (
                        <input
                          type="text"
                          disabled
                          placeholder="対象外"
                          className="w-full border border-slate-200 bg-slate-100 rounded p-1.5 text-sm text-slate-400 cursor-not-allowed"
                        />
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-500">還元単価 (円)</label>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 text-xs font-bold hover:underline"
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

          {/* 集計後の還元内訳一覧表 */}
          <div className="mt-4 border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="p-2 border-r border-slate-300">還元項目</th>
                  <th className="p-2 border-r border-slate-300 text-right w-28">還元単価</th>
                  <th className="p-2 border-r border-slate-300 text-center w-20">件数</th>
                  <th className="p-2 text-right w-32">還元額</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedSummary.map((summaryItem, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200">
                      {summaryItem.typeName}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">
                      ¥ {summaryItem.unitPrice.toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                      {summaryItem.count}
                    </td>
                    <td className="p-2 text-right font-mono font-semibold">
                      ¥ {summaryItem.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800">
                  <td colSpan={3} className="p-2 border-r border-slate-300 text-right">
                    合計還元額
                  </td>
                  <td className="p-2 text-right font-mono text-blue-700 text-base">
                    ¥ {totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 備考欄 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-600 mb-1">備考欄 (任意)</label>
          <textarea
            rows={2}
            placeholder="特記事項があればご記入ください"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
          />
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