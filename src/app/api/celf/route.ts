import { NextResponse } from 'next/server';

// ----------------------------------------------------
// GET: 最新の「振込No通番」を取得する処理
// ----------------------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetStoreName = searchParams.get('storeName') || '';
    const targetYymm = searchParams.get('transferNoYymm') || '';

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';
    const tableName = '後日cbデータtest';

    // CELF APIエンドポイントの構築
    // CELFの検索仕様に合わせて query 条件を追加（指定がある場合）
    let rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`;
    
    // CELF検索条件の組み立て（例: 店舗名='auStyle北習志野' AND 振込No年月='2609'）
    const conditions: string[] = [];
    if (targetStoreName) conditions.push(`店舗名='${targetStoreName}'`);
    if (targetYymm) conditions.push(`振込No年月='${targetYymm}'`);

    if (conditions.length > 0) {
      const queryStr = conditions.join(' AND ');
      rawUrl += `&query=${encodeURIComponent(queryStr)}`;
    }

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
      return NextResponse.json(
        { error: 'CELF取得失敗', status: response.status, detail: data },
        { status: response.status }
      );
    }

    // CELFから返却されるレコード配列の取得
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

    // ----------------------------------------------------
    // Node.js側でのフォールバック絞り込み（表記揺れ対策）
    // ----------------------------------------------------
    let filteredRecords = records;

    if (targetStoreName) {
      filteredRecords = filteredRecords.filter((row: any) => {
        const store = String(row['店舗名'] || row.店舗名 || row.storeName || '').trim();
        return store === targetStoreName.trim();
      });
    }

    if (targetYymm) {
      filteredRecords = filteredRecords.filter((row: any) => {
        const yymm = String(row['振込No年月'] || row.振込No年月 || row.transferNoYymm || '').trim();
        return yymm === targetYymm.trim();
      });
    }

    // サーバーログで絞り込み結果を確認（Vercel等のログで確認可能）
    console.log(`[CELF GET] 受け取ったパラメータ: storeName="${targetStoreName}", transferNoYymm="${targetYymm}"`);
    console.log(`[CELF GET] 取得全件数: ${records.length} 件 / 絞り込み後: ${filteredRecords.length} 件`);

    return NextResponse.json(filteredRecords);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ----------------------------------------------------
// POST: CELFへの一括登録処理
// ----------------------------------------------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      mode,
      storeName,
      agentCode,
      posAbbr,
      deptCode,
      posDate,
      memo,
      remittanceMethod,
      staffName,
      checkerName,
      counterNo,
      posBillNo,
      items,
      transferNoYymm,
      transferNoSeq,
    } = body;

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';

    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';

    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    const today = new Date();
    const receptionMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    let formattedPosDate = receptionMonth;
    if (posDate) {
      formattedPosDate = String(posDate).replace(/\//g, '-');
    }

    const records = (items || []).map((item: any, index: number) => {
      const amountNum = typeof item.amount === 'number' 
        ? item.amount 
        : Number(String(item.amount || '0').replace(/[^0-9.-]/g, '')) || 0;

      if (mode === '即時') {
        return {
          '店舗名': String(storeName || ''),
          '代理店コード': String(agentCode || ''),
          '略称': String(posAbbr || ''),
          '受付月': receptionMonth,
          '部門コード': String(deptCode || ''),
          'POS登録日': formattedPosDate,
          '申込書番号': String(item.appNo || ''),
          '還元内容': String(item.type || ''),
          'セット割申番': String(item.subAppNo || ''),
          '件数': 1,
          '還元金額': amountNum,
          '出金者': String(staffName || ''),
          '出金ダブルチェック': String(checkerName || ''),
          '接客カウンター番号': String(counterNo || ''),
          '備考欄': String(memo || ''),
          'POS業務伝票番号': String(posBillNo || ''),
          'リスト入力者': String(staffName || ''),
        };
      } else {
        const totalAmountVal = (index === 0 && item.totalTransferAmount !== undefined)
          ? (typeof item.totalTransferAmount === 'number' ? item.totalTransferAmount : Number(item.totalTransferAmount || 0))
          : '';

        return {
          '振込No年月': String(transferNoYymm || ''),
          '振込No通番': typeof transferNoSeq === 'number' ? transferNoSeq : Number(transferNoSeq || 0),
          '振込合計金額': totalAmountVal,
          
          '店舗名': String(storeName || ''),
          '代理店コード': String(agentCode || ''),
          '略称': String(posAbbr || ''),
          '受付月': receptionMonth,
          '部門コード': String(deptCode || ''),
          'POS登録日': formattedPosDate,
          '申込書番号': String(item.appNo || ''),
          '還元内容': String(item.type || ''),
          'セット割申番': String(item.subAppNo || ''),
          '件数': 1,
          '還元金額': amountNum,
          '送金方法': String(remittanceMethod || ''),
          '担当': String(staffName || ''),
          'ダブルチェック': String(checkerName || ''),
          '備考欄': String(memo || ''),
        };
      }
    });

    const payload = {
      [tableName]: records,
    };

    const response = await fetch(CELF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawText: responseText };
    }

    if (!response.ok) {
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
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}