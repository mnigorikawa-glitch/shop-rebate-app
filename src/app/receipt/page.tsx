'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceiptPage() {
  const router = useRouter();

  // 店舗名（ログイン画面から引き継ぎ、デフォルト値あり）
  const [storeName, setStoreName] = useState('au Style イオンモールつくば');

  // ログイン画面で選択された店舗名を自動読み込み
  useEffect(() => {
    const savedStore = sessionStorage.getItem('selectedStore');
    if (savedStore) {
      setStoreName(savedStore);
    }
  }, []);

  // --- 状態管理 ---
  // 還元種別: 'instant' (店頭現金) | 'deferred' (後日受領)
  const [rebateType, setRebateType] = useState<'instant' | 'deferred'>('instant');
  
  // 後日受領の場合の送金方法: 'bank' (口座振込) | 'atm' (セブン銀行ATM受取)
  const [remittanceMethod, setRemittanceMethod] = useState<'bank' | 'atm'>('bank');

  // 通番・日付
  const [seqNumber, setSeqNumber] = useState('0001');
  const [issueDate, setIssueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // お客様情報
  const [customerName, setCustomerName] = useState('');

  // 各種金額・口座情報など
  const [amount, setAmount] = useState<number | ''>('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState('普通');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // 署名データ
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 送信・通信状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 簡易バリデーション
  const isFormValid =
    customerName.trim() !== '' &&
    typeof amount === 'number' &&
    amount > 0 &&
    (rebateType === 'instant' || (rebateType === 'deferred' && remittanceMethod === 'atm') || (bankName !== '' && accountNumber !== '')) &&
    signatureDataUrl !== null;

  // --- 手書きサイン用キャンバス処理 ---
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
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, []);

  // --- 保存処理（CELF API連携） ---
  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsSubmitting(true);
    setSubmitMessage(null);

    const payload = {
      店舗名: storeName,
      通番: seqNumber,
      発行日付: issueDate,
      還元種別: rebateType === 'instant' ? '店頭現金' : '後日受領',
      送金方法: rebateType === 'deferred' ? (remittanceMethod === 'bank' ? '口座振込' : 'セブン銀行ATM受取') : '-',
      お客様氏名: customerName,
      キャッシュバック金額: amount,
      銀行名: rebateType === 'deferred' && remittanceMethod === 'bank' ? bankName : '',
      支店名: rebateType === 'deferred' && remittanceMethod === 'bank' ? branchName : '',
      預金種目: rebateType === 'deferred' && remittanceMethod === 'bank' ? accountType : '',
      口座番号: rebateType === 'deferred' && remittanceMethod === 'bank' ? accountNumber : '',
      口座名義: rebateType === 'deferred' && remittanceMethod === 'bank' ? accountHolder : '',
      電話番号: phoneNumber,
      署名データ: signatureDataUrl,
    };

    try {
      const res = await fetch('/api/celf/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitMessage({ type: 'success', text: 'CELFデータベースへ正常に登録・保存されました！' });
      } else {
        setSubmitMessage({
          type: 'error',
          text: `保存に失敗しました: ${data.message || 'APIエラーが発生しました'}`,
        });
      }
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: `通信エラー: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
        
        {/* ヘッダーエリア */}
        <div className="bg-slate-800 text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded font-bold">
                {storeName}
              </span>
              <span className="text-slate-400 text-sm">通番: {seqNumber}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold mt-2">キャッシュバック受領書 作成</h1>
          </div>
          <button
            onClick={() => router.push('/menu')}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-3 py-2 rounded-lg border border-slate-500 transition-all"
          >
            ← メニューへ戻る
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">

          {/* 還元種別切り替えタブ */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">1. 還元種別の選択</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRebateType('instant')}
                className={`py-3 px-4 rounded-xl border-2 text-center font-bold text-sm transition-all ${
                  rebateType === 'instant'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                💵 即時還元（店頭現金）
              </button>
              <button
                type="button"
                onClick={() => setRebateType('deferred')}
                className={`py-3 px-4 rounded-xl border-2 text-center font-bold text-sm transition-all ${
                  rebateType === 'deferred'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                🏦 後日受領（振込 / ATM受取）
              </button>
            </div>
          </div>

          {/* 後日受領の場合の送金方法選択 */}
          {rebateType === 'deferred' && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <label className="block text-sm font-bold text-amber-900">送金方法の選択</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRemittanceMethod('bank')}
                  className={`py-2 px-3 rounded-lg border font-bold text-xs transition-all ${
                    remittanceMethod === 'bank'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-amber-300 bg-white text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  銀行口座振込
                </button>
                <button
                  type="button"
                  onClick={() => setRemittanceMethod('atm')}
                  className={`py-2 px-3 rounded-lg border font-bold text-xs transition-all ${
                    remittanceMethod === 'atm'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-amber-300 bg-white text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  セブン銀行ATM受取
                </button>
              </div>
            </div>
          )}

          {/* 基本入力情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">発行日付 *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">お客様氏名 *</label>
              <input
                type="text"
                placeholder="例: 田中 太郎"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">キャッシュバック金額 (円) *</label>
            <input
              type="number"
              placeholder="例: 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-lg font-bold text-slate-800"
            />
          </div>

          {/* 口座情報（後日受領 且つ 口座振込の場合のみ表示） */}
          {rebateType === 'deferred' && remittanceMethod === 'bank' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-700">振込先口座情報</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="金融機関名 *"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="支店名 *"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs bg-white"
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
                <input
                  type="text"
                  placeholder="口座番号 *"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="col-span-2 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <input
                type="text"
                placeholder="口座名義（カナ） *"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>
          )}

          {/* 署名枠 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-600">ご署名 (手書き) *</label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] text-red-500 underline hover:text-red-700"
              >
                サインをクリア
              </button>
            </div>
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full h-36 touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>

          {/* メッセージ表示 */}
          {submitMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-bold ${
                submitMessage.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {submitMessage.text}
            </div>
          )}

          {/* 発行・登録ボタン */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-base shadow-md transition-all ${
              !isFormValid || isSubmitting
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? '保存・データ送信中...' : '受領書を発行しCELFへ保存'}
          </button>

        </div>
      </div>
    </div>
  );
}