import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tableName = '田中電子店舗データベース';
    const companyId = '340076c518';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // CELF公式仕様のエンドポイント (一括取得API)
    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    const response = await fetch(CELF_API_URL, {
      method: 'GET',
      headers: {
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      cache: 'no-store',
    });

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
      });
    }

    // レコード配列の柔軟な抽出（テーブル名キー、dataキー、またはレスポンス直下の配列に対応）
    let storeRecords: any[] = [];
    if (Array.isArray(data[tableName])) {
      storeRecords = data[tableName];
    } else if (Array.isArray(data.data)) {
      storeRecords = data.data;
    } else if (Array.isArray(data)) {
      storeRecords = data;
    } else {
      // 想定外の構造だった場合、レスポンスオブジェクト内の最初の配列を探す
      const firstArrayKey = Object.keys(data).find((key) => Array.isArray(data[key]));
      if (firstArrayKey) {
        storeRecords = data[firstArrayKey];
      }
    }

    // カラム名「店舗名」の抽出
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