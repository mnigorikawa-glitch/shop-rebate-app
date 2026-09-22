import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tableName = '田中電子店舗データベース';
    const companyId = '340076c518';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // CELFテーブル検索・取得APIのエンドポイント
    // searchエンドポイントと全件取得用ペイロードを構成
    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}/search?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    // POSTリクエストで空条件（全件取得）を送信するパターンとGETのフォールバック
    let response = await fetch(CELF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    // POSTで失敗した場合はGETエンドポイントで再試行
    if (!response.ok) {
      const getUrl = encodeURI(`https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`);
      response = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'X-CELF-API-KEY': CELF_API_KEY,
        },
        cache: 'no-store',
      });
    }

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { rawText: responseText };
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        stores: [],
        httpStatus: response.status,
        celfError: data,
        apiKeyPresent: !!CELF_API_KEY,
      });
    }

    // レコード抽出
    const storeRecords = data[tableName] || data.data || (Array.isArray(data) ? data : []);
    const stores = storeRecords
      .map((row: any) => row.店舗名 || row.store_name)
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      stores,
      rawCount: storeRecords.length,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      stores: [],
      error: error.message,
    });
  }
}