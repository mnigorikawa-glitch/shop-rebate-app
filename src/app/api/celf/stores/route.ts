import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tableName = '田中電子店舗データベース';
    const companyId = '340076c518';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // CELFテーブル検索/全件取得APIの構築
    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}/get?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    const response = await fetch(CELF_API_URL, {
      method: 'GET',
      headers: {
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('CELF店舗マスタ取得失敗、デフォルト店舗を返します');
      return NextResponse.json({ success: false, stores: [] });
    }

    const data = await response.json();
    // CELFからのレスポンスから店舗名一覧を抽出
    const storeRecords = data[tableName] || data.data || [];
    const stores = storeRecords
      .map((row: any) => row.店舗名 || row.store_name)
      .filter(Boolean);

    return NextResponse.json({ success: true, stores });
  } catch (error: any) {
    console.error('店舗マスタAPIエラー:', error);
    return NextResponse.json({ success: false, stores: [], error: error.message });
  }
}