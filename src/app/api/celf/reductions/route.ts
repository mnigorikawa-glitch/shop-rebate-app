import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tableName = '還元内容';
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
        reductions: [],
        httpStatus: response.status,
        celfError: data,
      });
    }

    // レコード配列の抽出処理
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

    return NextResponse.json({
      success: true,
      reductions: records,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      reductions: [],
      error: error.message,
    });
  }
}