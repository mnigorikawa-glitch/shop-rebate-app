import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      mode,
      storeName,
      agentCode,
      posAbbr,
      deptCode,
      posDate,
      memo,
      remittanceMethod,
      staffName,
      checkerName,
      counterNo,
      posBillNo,
      items,
    } = body;

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';

    // テーブル名の設定
    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';

    // CELF公式一括登録エンドポイント
    const CELF_API_URL = encodeURI(
      `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`
    );

    // CELFテーブル構造に完全に一致するオブジェクト配列を作成
    const records = (items || []).map((item: any) => {
      const row: any = {
        店舗名: String(storeName || ''),
        代理店コード: String(agentCode || ''),
        略称: String(posAbbr || ''),
        部門コード: String(deptCode || ''),
        POS登録日: String(posDate || ''),
        備考欄: String(memo || ''),
        担当者名: String(staffName || ''),
        Wチェック者名: String(checkerName || ''),
        還元項目: String(item.type || ''),
        申込書番号: String(item.appNo || ''),
        セット割申番: String(item.subAppNo || ''),
        金額: Number(item.amount) || 0,
      };

      if (mode === '即時') {
        row['POS業務伝票番号'] = String(posBillNo || '');
        row['お渡しカウンター'] = String(counterNo || '');
      } else {
        row['還元方法'] = String(remittanceMethod || '');
      }

      return row;
    });

    // CELF API 仕様に基づいたボディ形式
    const payload = {
      [tableName]: records,
    };

    const response = await fetch(CELF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawText: responseText };
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        httpStatus: response.status,
        celfResponse: responseData,
        sentPayload: payload, // デバッグ用：送信した内容を返す
      });
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}