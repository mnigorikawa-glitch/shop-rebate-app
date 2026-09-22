import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tableName = '田中電子店舗データベース';
    const companyId = '340076c518';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // URLの構築
    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}/get?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    const response = await fetch(CELF_API_URL, {
      method: 'GET',
      headers: {
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      cache: 'no-store',
    });

    // CELFからの生レスポンスを取得
    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { rawText: responseText };
    }

    if (!response.ok) {
      console.warn('CELF店舗マスタ取得失敗:', response.status, data);
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
    console.error('店舗マスタAPIエラー:', error);
    return NextResponse.json({
      success: false,
      stores: [],
      error: error.message,
    });
  }
}