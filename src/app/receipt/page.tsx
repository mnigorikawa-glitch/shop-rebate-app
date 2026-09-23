'use client';

import React, { useState, useEffect, useRef } from 'react';

// --- 型定義 ---
interface DetailItem {
  id: string;
  rebateContent: string;
  applicationNo: string;
  setDiscountNo: string;
  unitPrice: number | string;
  rebateItemName: string;
  quantity: number;
}

export default function ReceiptPage() {
  // 画面基本情報
  const [storeName, setStoreName] = useState('auStyle鎌ケ谷');
  const [counter, setCounter] = useState('1番カウンター');
  const [checker, setChecker] = useState('いとう');
  const [staff, setStaff] = useState('さとう'); // 担当者（出金/入力者）
  const [agencyCode, setAgencyCode] = useState('TNK001'); // 代理店/部門コード例

  // 還元方法: '即時処理' | '口座振替' | 'ATM受取'
  const [rebateMethod, setRebateMethod] = useState<'即時処理' | '口座振替' | 'ATM受取'>('即時処理');
  const [transferNo, setTransferNo] = useState<string>('即時処理');
  const [yymm, setYymm] = useState<string>('');
  const [sequenceNo, setSequenceNo] = useState<number>(0);

  // 明細リスト
  const [details, setDetails] = useState<DetailItem[]>([
    {
      id: '1',
      rebateContent: 'SIM単体MNP契約',
      applicationNo: 'E22222222',
      setDiscountNo: '対象外',
      unitPrice: 20000,
      rebateItemName: 'auUQ_SIM単体MNP',
      quantity: 1,
    },
  ]);

  const [remarks, setRemarks] = useState('とくになり');

  // 同意チェックボックスの状態
  const [agreeTerms, setAgreeTerms] = useState<boolean[]>([]);
  const [finalConsent, setFinalConsent] = useState<boolean>(false);

  // 手書き署名
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // --- 1. 初期ロード時 & 還元方法変更時の処理 ---
  useEffect(() => {
    // 同意チェックボックスの初期化
    if (rebateMethod === '口座振替') {
      setAgreeTerms([false, false, false]); // 3項目
    } else if (rebateMethod === 'ATM受取') {
      setAgreeTerms([false, false, false, false, false]); // 5項目
    } else {
      setAgreeTerms([]);
    }
    setFinalConsent(false);

    // 振込Noの取得（後日キャッシュバックの場合）
    if (rebateMethod !== '即時処理') {
      fetchLatestTransferNo();
    } else {
      setTransferNo('即時処理');
    }
  }, [rebateMethod]);

  // 全同意文言チェック時に最終同意チェックを有効化するかの判定
  const isAllTermsAgreed =
    rebateMethod === '即時処理' ||
    (agreeTerms.length > 0 && agreeTerms.every((v) => v === true));

  // --- 2. CELFから最新の振込No通番を取得（GET） ---
  const fetchLatestTransferNo = async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const currentYymmPrefix = `${yy}${mm}-`; // "2609-"

    setYymm(currentYymmPrefix);

    try {
      // 既存のCELF GET APIを呼び出し
      const res = await fetch(`/api/celf?agencyCode=${agencyCode}`);
      if (res.ok) {
        const data = await res.json();
        // 該当店舗かつ当月データの「振込No通番」の最大値を算出
        let maxSeq = 0;
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.振込No通番 && typeof item.振込No通番 === 'number') {
              if (item.振込No通番 > maxSeq) maxSeq = item.振込No通番;
            }
          });
        }
        const nextSeq = maxSeq + 1;
        setSequenceNo(nextSeq);
        setTransferNo(`${currentYymmPrefix}${nextSeq}`);
      } else {
        // フォールバック
        setSequenceNo(1);
        setTransferNo(`${currentYymmPrefix}1`);
      }
    } catch (e) {
      console.error('振込Noの取得に失敗しました', e);
      setSequenceNo(1);
      setTransferNo(`${currentYymmPrefix}1`);
    }
  };

  // --- 3. 明細計算 ---
  const totalAmount = details.reduce((sum, item) => {
    const price = Number(item.unitPrice) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

  // --- 4. 署名キャンバス処理 ---
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
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // --- 5. 発行・保存処理（二重チェック＆CELF送信） ---
  const handleSubmit = async () => {
    if (!finalConsent) {
      alert('同意チェック項目をご確認ください。');
      return;
    }
    if (!hasSignature) {
      alert('お客様署名をご記入ください。');
      return;
    }

    let finalSeq = sequenceNo;
    let finalTransferNoStr = transferNo;

    // 後日CBの場合は印刷直前に二重採番チェック
    if (rebateMethod !== '即時処理') {
      try {
        const res = await fetch(`/api/celf?agencyCode=${agencyCode}`);
        if (res.ok) {
          const data = await res.json();
          let maxSeq = 0;
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              if (item.振込No通番 && typeof item.振込No通番 === 'number') {
                if (item.振込No通番 > maxSeq) maxSeq = item.振込No通番;
              }
            });
          }
          // すでに画面表示時の通番以上が存在していたら最新+1へ振り直し
          if (maxSeq >= sequenceNo) {
            finalSeq = maxSeq + 1;
            finalTransferNoStr = `${yymm}${finalSeq}`;
            setSequenceNo(finalSeq);
            setTransferNo(finalTransferNoStr);
          }
        }
      } catch (e) {
        console.error('二重チェック失敗', e);
      }
    }

    // CELF登録用データの作成（複数明細対応）
    const payloadList = details.map((item, index) => {
      const baseData: any = {
        店舗名: storeName,
        お渡しカウンター: counter,
        担当者: staff,
        Wチェック者: checker,
        還元方法: rebateMethod,
        還元内容: item.rebateContent,
        申込書番号: item.applicationNo,
        セット割申番: item.setDiscountNo,
        還元単価: Number(item.unitPrice),
        還元項目: item.rebateItemName,
        件数: Number(item.quantity),
        還元額: Number(item.unitPrice) * Number(item.quantity),
        備考欄: remarks,
      };

      // 後日キャッシュバック固有項目
      if (rebateMethod !== '即時処理') {
        baseData['振込No年月'] = yymm; // "2609-"
        baseData['振込No通番'] = finalSeq; // 数値
        // 1項目目（一番上）のデータのみ「振込合計金額」をセット
        if (index === 0) {
          baseData['振込合計金額'] = totalAmount;
        } else {
          baseData['振込合計金額'] = null;
        }
      }

      return baseData;
    });

    try {
      const res = await fetch('/api/celf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadList),
      });

      if (res.ok) {
        const successMsg =
          rebateMethod === '即時処理'
            ? '受領書を保存しました。（振込No: 即時処理）'
            : `受領書を保存しました。（振込No: ${finalTransferNoStr}で登録しました）`;
        alert(successMsg);
        window.print(); // PDF印刷ダイアログ表示
      } else {
        const errData = await res.json();
        alert(`登録エラー:\n${JSON.stringify(errData, null, 2)}`);
      }
    } catch (e) {
      alert(`通信エラーが発生しました: ${e}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-gray-800 text-sm">
      <h1 className="text-xl font-bold border-b-2 border-gray-800 pb-2 mb-4">
        店舗還元 受領書作成
      </h1>

      {/* 1. 基本情報 */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded border">
        {/* 即時処理以外の場合のみ店舗名を表示（即時は最上部に表示されているため不要） */}
        {rebateMethod !== '即時処理' && (
          <div>
            <label className="block text-xs font-bold mb-1">店舗名</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full border p-1 rounded"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold mb-1">お渡しカウンター</label>
          <input
            type="text"
            value={counter}
            onChange={(e) => setCounter(e.target.value)}
            className="w-full border p-1 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">担当者（出金/入力者）</label>
          <input
            type="text"
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className="w-full border p-1 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Wチェック者</label>
          <input
            type="text"
            value={checker}
            onChange={(e) => setChecker(e.target.value)}
            className="w-full border p-1 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">還元方法</label>
          <select
            value={rebateMethod}
            onChange={(e) => setRebateMethod(e.target.value as any)}
            className="w-full border p-1 rounded font-bold bg-white"
          >
            <option value="即時処理">即時処理（店頭現金渡）</option>
            <option value="口座振替">口座振替</option>
            <option value="ATM受取">ATM受取</option>
          </select>
        </div>
        {rebateMethod !== '即時処理' && (
          <div>
            <label className="block text-xs font-bold mb-1">振込No (自動採番)</label>
            <input
              type="text"
              value={transferNo}
              readOnly
              className="w-full border p-1 rounded bg-gray-100 font-bold text-blue-700"
            />
          </div>
        )}
      </div>

      {/* 2. 還元内容内訳 */}
      <div className="mb-4">
        <h2 className="font-bold border-b pb-1 mb-2">2. 還元内容内訳</h2>
        <table className="w-full border-collapse border text-left text-xs mb-2">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="border p-2">還元項目</th>
              <th className="border p-2">還元単価</th>
              <th className="border p-2">件数</th>
              <th className="border p-2 text-right">還元額</th>
            </tr>
          </thead>
          <tbody>
            {details.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="border p-2">{item.rebateItemName}</td>
                <td className="border p-2">¥ {Number(item.unitPrice).toLocaleString()}</td>
                <td className="border p-2">{item.quantity}</td>
                <td className="border p-2 text-right">
                  ¥ {(Number(item.unitPrice) * Number(item.quantity)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-bold text-base pr-2 mb-4">
          合計還元額: <span className="text-blue-700">¥ {totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* 備考欄 */}
      <div className="mb-4">
        <label className="block text-xs font-bold mb-1">備考欄 (任意)</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full border p-2 rounded h-16 text-xs"
        />
      </div>

      {/* 3. 同意事項 / 免責事項（動的切り替え） */}
      {rebateMethod === '口座振替' && (
        <div className="mb-4 p-3 border border-blue-200 bg-blue-50 rounded text-xs space-y-2">
          <div className="font-bold text-blue-900 mb-1">【口座振替に関する同意事項】</div>
          {[
            '振込依頼書にご記入いただいた口座へお振込み致します。原則として振込先口座の変更はできません。',
            '振込先口座情報の記入不備があった場合、お振込みができません。口座情報は『正確な内容』を『記入漏れがないよう』ご注意ください。',
            'お振り込みが確認できない場合は、受付店舗までご連絡ください。振込用紙の記入不備によりお振込みができなかった場合、振込予定日から90日以内に正しい口座情報を受付店舗へご連絡いただければ、お振込みが可能です。ただし、お振込予定日から90日を経過した場合は、正しい口座情報をご連絡いただいてもお振込みできませんので、ご了承下さい。',
          ].map((text, idx) => (
            <label key={idx} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms[idx] || false}
                onChange={(e) => {
                  const next = [...agreeTerms];
                  next[idx] = e.target.checked;
                  setAgreeTerms(next);
                }}
                className="mt-0.5"
              />
              <span>{text}</span>
            </label>
          ))}
        </div>
      )}

      {rebateMethod === 'ATM受取' && (
        <div className="mb-4 p-3 border border-green-200 bg-green-50 rounded text-xs space-y-2">
          <div className="font-bold text-green-900 mb-1">【ATM受取に関する同意事項】</div>
          {[
            'ご契約日の翌々月末頃にお客様の電話番号宛に受取案内のメッセージを配信致します。',
            '受取案内メッセージが迷惑メールフォルダに届いてしまう場合がございます。メッセージが未着の際は、迷惑メールフォルダに受信がないかご確認をお願い致します。',
            '還元時期を過ぎても、メッセージが未着の場合は、お手数おかけ致しますが、受付店舗へご連絡をお願い致します。',
            '入力フォームへの登録に不備があった場合や受取案内のメッセージが未着の場合は、ご本人様確認をさせていただき、口座振働で還元手続きを行いますので再度来店いただきます。当初の還元時期より遅れてしまいますが予めご了承下さい。\n再来店時、独自還元の控え（この用紙）をお持ちでないと還元手続きができません。この用紙はキャッシュバックを受領するまで大切に保管して下さい。 再来店時の持ち物：①本人確認書類(免許証・マイナンバーカード等) ②この用紙のコピー ➂通帳(口座情報がわかるもの)',
            'セブン銀行ATMでの受取期限はメッセージが到着後、90日間です。期限を超過するとお受け取りできませんのでご了承ください。',
          ].map((text, idx) => (
            <label key={idx} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms[idx] || false}
                onChange={(e) => {
                  const next = [...agreeTerms];
                  next[idx] = e.target.checked;
                  setAgreeTerms(next);
                }}
                className="mt-0.5"
              />
              <span className="whitespace-pre-line">{text}</span>
            </label>
          ))}
        </div>
      )}

      {/* 4. 最終確認・同意チェック */}
      <div className="mb-4">
        <label
          className={`flex items-center gap-2 font-bold text-xs p-2 rounded border ${
            !isAllTermsAgreed
              ? 'opacity-50 cursor-not-allowed bg-gray-100'
              : 'cursor-pointer bg-yellow-50 border-yellow-300'
          }`}
        >
          <input
            type="checkbox"
            disabled={!isAllTermsAgreed}
            checked={finalConsent}
            onChange={(e) => setFinalConsent(e.target.checked)}
          />
          <span>
            {rebateMethod === '即時処理'
              ? '上記内容に相違ないことを確認し、現金を受領しました。'
              : '上記内容についてスタッフから説明を受け、同意しました'}
          </span>
        </label>
      </div>

      {/* 5. 署名欄 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold">お客様署名欄 (枠内に手書き)</label>
          <button
            type="button"
            onClick={clearSignature}
            className="text-xs text-red-600 underline"
          >
            クリア
          </button>
        </div>
        <div className="border rounded bg-white p-1">
          <canvas
            ref={canvasRef}
            width={700}
            height={150}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-36 touch-none bg-white cursor-crosshair"
          />
        </div>
      </div>

      {/* 発行ボタン */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-8 rounded text-base shadow"
        >
          受領書発行・印刷
        </button>
      </div>
    </div>
  );
}