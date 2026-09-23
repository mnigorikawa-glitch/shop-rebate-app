import { NextResponse } from 'next/server';

// ----------------------------------------------------
// GET: 最新の「振込No通番」を取得する処理
// ----------------------------------------------------
export async function GET(request: Request) {
  try {
    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';
    const tableName = '後日cbデータtest';

    // CELFデータ全件取得・検索用エンドポイント (/records)
    const CELF_API_URL = encodeURI(
      `https://cloud.celf.jp/api/57v1/tables/${tableName}/records?company=${companyId}`
    );

    const response = await fetch(CELF_API_URL, {
      method: 'GET',
      headers: {
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'CELF取得失敗', status: response.status, detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    // CELFの返却データ形式（配列直接、または data.records / data[tableName]）にフレキシブルに対応
    const records = Array.isArray(data)
      ? data
      : data.records || data[tableName] || [];

    return NextResponse.json(records);
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

    const CELF_API_URL = encodeURI(
      `https://cloud.celf.jp/celf-fls-web/api/57v1/tables/${tableName}/bulkinsert?company=${companyId}`
    );

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
        // 振込合計金額: 1行目のみ数値、2行目以降は空文字 ''
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
        'Content-Type': 'application/json; charset=utf-8',
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