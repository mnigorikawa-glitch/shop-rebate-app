import { NextResponse } from 'next/server';

// ----------------------------------------------------
// GET: 最新の「振込No通番」を取得する処理（deptCode のみで検証）
// ----------------------------------------------------
export async function GET(request: Request) {
  try {
    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';
    const tableName = '後日cbデータtest';

    const { searchParams } = new URL(request.url);
    const targetDeptCode = searchParams.get('deptCode') || '';

    // CELF APIエンドポイント（全件取得）
    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    console.log('[CELF GET Request URL]:', CELF_API_URL);
    console.log('[Target DeptCode]:', targetDeptCode);

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

    console.log(`[CELF Fetch Success] CELFから取得した総件数: ${records.length}件`);

    // 1件目のキー一覧（列名）をログ出力して、カラム名の不一致がないか確認
    if (records.length > 0) {
      console.log('[CELF Sample Record Keys]:', Object.keys(records[0]));
    }

    // deptCode のみで絞り込み
    let filteredRecords = records;

    if (targetDeptCode) {
      filteredRecords = filteredRecords.filter((row: any) => {
        // 部門コードに該当する可能性のあるキーを全て確認（文字型/数値型の違いも吸収）
        const deptVal = row['部門コード'] ?? row.部門コード ?? row.deptCode ?? '';
        return String(deptVal).trim() === targetDeptCode.trim();
      });
    }

    console.log(`[Filtered Success] deptCode=${targetDeptCode} での絞り込み結果: ${filteredRecords.length}件`);

    // 絞り込んだ結果を返す
    return NextResponse.json(filteredRecords);
  } catch (error: any) {
    console.error('[CELF GET Internal Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}