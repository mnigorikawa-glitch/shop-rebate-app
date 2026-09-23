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

    // リクエストパラメータの組み立て
    // limit: 一度に取得する件数（タイムアウトを防ぎつつ十分な件数を確保するため 10000 に設定）
    // sort: 最新データを上に持ってくるために降順ソート（例: -POS登録日 や -id など）
    const limit = 3000;
    const sort = '-ID'; // もし「POS登録日」でエラーになる場合は「-id」などに変更してください

    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}&limit=${limit}&sort=${sort}';
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

    console.log(`[CELF Fetch Success] CELFから取得した件数: ${records.length}件`);

    // 条件による絞り込み（店舗名・部門コード・振込No年月）
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

    console.log(`[Filtered Success] 絞り込み後件数: ${filteredRecords.length}件`);

    return NextResponse.json(filteredRecords);
  } catch (error: any) {
    console.error('[CELF GET Internal Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}