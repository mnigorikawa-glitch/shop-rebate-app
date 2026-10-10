import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json([]);
}

// ----------------------------------------------------
// POST: 原因特定のための最小構成テスト送信
// ----------------------------------------------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, storeName, items } = body;

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';

    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';

    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    // 【最小構成】必要最小限の基本項目（店舗名・還元金額）のみに絞り込み
    const records = (items || []).map((item: any) => {
      return {
        '店舗名': String(storeName || 'テスト店舗'),
        '還元金額': Number(item.amount) || 0,
      };
    });

    const payload = {
      [tableName]: records,
    };

    console.log('[DEBUG] CELF POST Minimal Payload:', JSON.stringify(payload));

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
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { rawText: responseText };
    }

    if (!response.ok) {
      console.error(`[CELF POST DEBUG ERROR] Status: ${response.status}`, responseText);
      return NextResponse.json({
        success: false,
        httpStatus: response.status,
        celfResponse: responseData,
        sentPayloadString: JSON.stringify(payload),
      });
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[CELF POST Debug Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '内部エラーが発生しました',
      },
      { status: 500 }
    );
  }
}