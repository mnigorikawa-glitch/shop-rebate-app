'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- 型定義 ---
interface ReceiptItem {
  id: string;
  contentType: string; // 例: '自宅セット割(でんきコース)'
  appNumberType: string; // '既存+トクトク2' | '既存+コミコミバリュー' など
  setDiscountNum: string; // セット割申番
  unitPrice: number; // 還元単価
}

interface SummaryRow {
  contentType: string;
  unitPrice: number;
  count: number;
  subtotal: number;
}

export default function ReceiptPage() {
  // --- フォーム状態 ---
  const [customerName, setCustomerName] = useState<string>('志賀太郎');
  const [posDate, setPosDate] = useState<string>('2026-09-23');
  const [paymentMethod, setPaymentMethod] = useState<string>('口座振替'); // 口座振替, 窓口現金 等
  const [transferNo, setTransferNo] = useState<string>('2609-1'); // 自動採番の振込No
  const [staffName, setStaffName] = useState<string>('佐藤');
  const [checkerName, setCheckerName] = useState<string>('伊東');
  const [remarks, setRemarks] = useState<string>('');

  // 明細リスト
  const [items, setItems] = useState<ReceiptItem[]>([
    {
      id: '1',
      contentType: '自宅セット割(でんきコース)',
      appNumberType: '既存+トクトク2',
      setDiscountNum: 'EQ1234567',
      unitPrice: 10000,
    },
    {
      id: '2',
      contentType: '自宅セット割(ネットコース)',
      appNumberType: '既存+コミコミバリュー',
      setDiscountNum: 'EQ1234567',
      unitPrice: 10000,
    },
    {
      id: '3',
      contentType: '自宅セット割(でんきコース)',
      appNumberType: '既存+トクトク2',
      setDiscountNum: 'EQ1234567',
      unitPrice: 10000,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- 計算ロジック ---
  // 還元項目ごとの集計テーブル用データ
  const summaryRows = useMemo<SummaryRow[]>(() => {
    const map = new Map<string, { unitPrice: number; count: number }>();

    items.forEach((item) => {
      if (!item.contentType) return;
      const key = item.contentType;
      const current = map.get(key) || { unitPrice: item.unitPrice, count: 0 };
      map.set(key, {
        unitPrice: item.unitPrice,
        count: current.count + 1,
      });
    });

    return Array.from(map.entries()).map(([contentType, data]) => ({
      contentType,
      unitPrice: data.unitPrice,
      count: data.count,
      subtotal: data.unitPrice * data.count,
    }));
  }, [items]);

  // 合計還元額
  const totalAmount = useMemo<number>(() => {
    return summaryRows.reduce((acc, row) => acc + row.subtotal, 0);
  }, [summaryRows]);

  // --- 操作ハンドラ ---
  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: Date.now().toString(),
      contentType: '自宅セット割(でんきコース)',
      appNumberType: '既存+トクトク2',
      setDiscountNum: '',
      unitPrice: 10000,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ReceiptItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // 必要に応じて単価の自動設定などを拡張
          return updated;
        }
        return item;
      })
    );
  };

  // --- 保存・CELF連携処理 ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. 振込Noの分割処理 (例: "2609-1" -> 年月: "2609", 通番: "1")
      const [transferNoYearMonth, transferNoSeq] = transferNo ? transferNo.split('-') : ['', ''];

      // 2. CELF登録用データの構造化
      const celfDataList = items.map((item, index) => {
        // 【修正点②】合計還元額は「1つ目のデータ（index === 0）」にのみ設定
        const rowTotalAmount = index === 0 ? totalAmount : 0;

        return {
          customerName,
          posDate,
          paymentMethod,
          staffName,
          checkerName,
          remarks,

          // 【修正点①】CELFの後日cbデータ test カラム列「振込No年月」「振込No通番」へ個別に格納
          振込No年月: transferNoYearMonth || '',
          振込No通番: transferNoSeq || '',

          // 明細データ
          contentType: item.contentType,
          appNumberType: item.appNumberType,
          setDiscountNum: item.setDiscountNum,
          unitPrice: item.unitPrice,

          // 合計還元額 (1件目のみ値、2件目以降は0)
          totalAmount: rowTotalAmount,
        };
      });

      // API呼び出し例 (実際のエンドポイントに合わせて調整)
      const response = await fetch('/api/celf/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: celfDataList }),
      });

      if (!response.ok) {
        throw new Error('CELFへのデータ保存に失敗しました。');
      }

      alert('正常に保存されました。');
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました。保存処理を確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 min-h-screen text-slate-800">
      <h1 className="text-xl font-bold mb-6 text-slate-900 border-b pb-2">店舗還元 受領書作成</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. 基本情報 */}
        <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-l-4 border-blue-600 pl-2">
            1. 基本情報
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                お客様名 (印刷用お宛名)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                日付 (POS登録日) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={posDate}
                onChange={(e) => setPosDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                還元方法 <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-slate-50 focus:bg-white"
              >
                <option value="口座振替">口座振替</option>
                <option value="窓口現金">窓口現金</option>
                <option value="後日キャッシュバック">後日キャッシュバック</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                振込No (自動採番)
              </label>
              <input
                type="text"
                value={transferNo}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-slate-100 text-slate-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                担当者 (出金/入力者) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Wチェック者
              </label>
              <input
                type="text"
                value={checkerName}
                onChange={(e) => setCheckerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </section>

        {/* 2. 還元内容内訳 */}
        <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 border-l-4 border-blue-600 pl-2">
              2. 還元内容内訳
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-700 transition"
            >
              + 内訳を追加
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-3 border border-slate-200 rounded bg-slate-50/50 relative grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    還元内容 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.contentType}
                    onChange={(e) => handleItemChange(item.id, 'contentType', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="自宅セット割(でんきコース)">自宅セット割(でんきコース)</option>
                    <option value="自宅セット割(ネットコース)">自宅セット割(ネットコース)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    申込書番号 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.appNumberType}
                    onChange={(e) => handleItemChange(item.id, 'appNumberType', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="既存+トクトク2">既存+トクトク2</option>
                    <option value="既存+コミコミバリュー">既存+コミコミバリュー</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    セット割申番
                  </label>
                  <input
                    type="text"
                    value={item.setDiscountNum}
                    onChange={(e) => handleItemChange(item.id, 'setDiscountNum', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      還元単価 (円)
                    </label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(item.id, 'unitPrice', Number(e.target.value))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-right bg-white"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-xs text-red-600 font-semibold hover:underline pt-4"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 集計テーブル */}
          <div className="mt-6 border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="p-2.5">還元項目</th>
                  <th className="p-2.5 text-right">還元単価</th>
                  <th className="p-2.5 text-center">件数</th>
                  <th className="p-2.5 text-right">還元額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {summaryRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{row.contentType}</td>
                    <td className="p-2.5 text-right font-mono">
                      ¥ {row.unitPrice.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-center">{row.count}</td>
                    <td className="p-2.5 text-right font-mono font-semibold">
                      ¥ {row.subtotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="p-2.5 text-right font-bold text-slate-700">
                    合計還元額
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                    ¥ {totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 備考欄 */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              備考欄 (任意)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="特記事項があればご記入ください"
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white"
            />
          </div>
        </section>

        {/* 送信ボタン */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded shadow hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? '保存中...' : '受領書データを保存 / CELF送信'}
          </button>
        </div>
      </form>
    </div>
  );
}