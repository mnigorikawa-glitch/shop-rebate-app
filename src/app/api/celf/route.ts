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

    const limit = 2000;
    const sortColumn = '-ID';

    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}&limit=${limit}&sort=${encodeURIComponent(sortColumn)}`;
    const CELF_API_URL = encodeURI(rawUrl);

    console.log('[CELF GET Request URL with Sort]:', CELF_API_URL);

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
      data = responseText ? JSON.parse(responseText) : {};
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

// ----------------------------------------------------
// POST: CELFへの一括登録処理（完全型変換＆フォーマット正規化）
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
      customerName,
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
      totalAmount,
    } = body;

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';

    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';

    const rawUrl = `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`;
    const CELF_API_URL = encodeURI(rawUrl);

    const today = new Date();
    // 受付月（YYYY/MM/01 フォーマット）
    const receptionMonth = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/01`;

    // POS登録日（スラッシュ区切りの標準日付表記に変換）
    let formattedPosDate = receptionMonth;
    if (posDate) {
      formattedPosDate = String(posDate).replace(/-/g, '/');
    }

    const records = (items || []).map((item: any, index: number) => {
      // 金額数値の厳格変換
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
          'お客様名': String(customerName || ''),
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
        const seqNum = Number(transferNoSeq) || 0;
        const calcTotal = Number(totalAmount ?? item.totalTransferAmount) || 0;

        // すべてのキーを同一の順序・型構造で固定出力
        const recordObj: Record<string, any> = {
          '振込No年月': String(transferNoYymm || ''),
          '振込No通番': seqNum,
          '振込合計金額': index === 0 ? calcTotal : 0, // 2件目以降は 0 に固定
          '店舗名': String(storeName || ''),
          '代理店コード': String(agentCode || ''),
          '略称': String(posAbbr || ''),
          '受付月': receptionMonth,
          '部門コード': String(deptCode || ''),
          'お客様名': String(customerName || ''),
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

        return recordObj;
      }
    });

    const payload = {
      [tableName]: records,
    };

    console.log('[CELF POST Strictly Formatted Payload]:', JSON.stringify(payload));

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
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { rawText: responseText };
    }

    if (!response.ok) {
      console.error(`[CELF POST ERROR] Status: ${response.status}`, responseText);
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
    console.error('[CELF POST Internal Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '内部サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}