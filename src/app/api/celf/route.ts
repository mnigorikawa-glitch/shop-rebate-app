import { NextResponse } from 'next/server';

// ----------------------------------------------------
// GET: 最新の「振込No通番」を取得する処理
// ----------------------------------------------------
export async function GET(request: Request) {
  try {
    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';
    const tableName = '後日cbデータtest';

    const { searchParams } = new URL(request.url);
    const targetStoreName = searchParams.get('storeName') || '';
    const targetDeptCode = searchParams.get('deptCode') || '';
    const targetYymm = searchParams.get('transferNoYymm') || '';

    // CELF APIクエリ構築：CELF側でのqueryパラメータを使わず、全件取得してからNode.js側で絞り込む
    // （クエリ文字の特殊文字によるエラーや403回避のため）
    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    console.log('[CELF GET Request URL]:', CELF_API_URL);

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
      console.error(`[CELF GET ERROR] Status: ${response.status}`, responseText);
      return NextResponse.json(
        {
          error: `CELFテーブル [${tableName}] へのアクセスでエラーが発生しました。`,
          status: response.status,
          detail: data,
        },
        { status: response.status }
      );
    }

    // 返却データの抽出
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

    // Node.js側で安全に絞り込み（トリムして判定）
    let filteredRecords = records;

    if (targetStoreName) {
      filteredRecords = filteredRecords.filter((row: any) => {
        const store = String(row['店舗名'] || row.店舗名 || row.storeName || '').trim();
        return store === targetStoreName.trim();
      });
    }

    if (targetDeptCode) {
      filteredRecords = filteredRecords.filter((row: any) => {
        const dept = String(row['部門コード'] || row.部門コード || row.deptCode || '').trim();
        return dept === targetDeptCode.trim();
      });
    }

    if (targetYymm) {
      filteredRecords = filteredRecords.filter((row: any) => {
        const yymm = String(row['振込No年月'] || row.振込No年月 || row.transferNoYymm || '').trim();
        return yymm === targetYymm.trim();
      });
    }

    return NextResponse.json(filteredRecords);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}