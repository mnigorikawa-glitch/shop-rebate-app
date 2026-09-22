import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tableName = '田中電子店舗データベース';
    const companyId = '340076c518';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

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

    let records: any[] = [];
    if (Array.isArray(data[tableName])) {
      records = data[tableName];
    } else if (Array.isArray(data.data)) {
      records = data.data;
    } else if (Array.isArray(data)) {
      records = data;
    } else {
      const firstArrayKey = Object.keys(data).find((key) => Array.isArray(data[key]));
      if (firstArrayKey) {
        records = data[firstArrayKey];
      }
    }

    // 全フィールドを含んだ店舗オブジェクトとして返す
    const stores = records.map((row: any) => ({
      storeName: row.店舗名 || row.store_name || '',
      agentCode: row.代理店コード || '',
      posAbbr: row.POS略称 || '',
      deptCode: row.部門コード || '',
      zipCode: row.郵便番号 || '',
      address: row.住所 || '',
      branchFlag: Number(row.出張所フラグ ?? 0),
    })).filter((s) => s.storeName !== '');

    return NextResponse.json({
      success: true,
      stores,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      stores: [],
      error: error.message,
    });
  }
}