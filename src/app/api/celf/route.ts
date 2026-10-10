import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, storeName, items } = body;

    const CELF_API_KEY = process.env.CELF_API_KEY || '016e7269-7d7c-4654-a08d-a2aff307176d';
    const companyId = '340076c518';

    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';

    // テーブル名をエンコード
    const encodedTableName = encodeURIComponent(tableName);
    const CELF_API_URL = `https://api.cloud.celf.jp/v1/tables/${encodedTableName}?company=${companyId}`;

    const records = (items || []).map((item: any) => {
      return {
        '店舗名': String(storeName || ''),
        '還元金額': Number(item.amount) || 0,
      };
    });

    const payload = {
      [tableName]: records,
    };

    console.log('[DEBUG URL]:', CELF_API_URL);
    console.log('[DEBUG PAYLOAD]:', JSON.stringify(payload));

    const response = await fetch(CELF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
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
      console.error(`[CELF POST ERROR] Status: ${response.status}`, responseText);
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}