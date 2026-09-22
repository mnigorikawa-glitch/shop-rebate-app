import { NextResponse } from 'next/server';

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
    } = body;

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';

    // 対象テーブル名
    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';

    const CELF_API_URL = encodeURI(
      `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`
    );

    // CELFテーブル構造に適合させたレコード配列の生成
    const records = (items || []).map((item: any) => {
      const amountNum = typeof item.amount === 'number' 
        ? item.amount 
        : Number(String(item.amount || '0').replace(/[^0-9.-]/g, '')) || 0;

      const record: Record<string, any> = {
        '店舗名': storeName ? String(storeName) : '',
        '代理店コード': agentCode ? String(agentCode) : '',
        '略称': posAbbr ? String(posAbbr) : '',
        '部門コード': deptCode ? String(deptCode) : '',
        'POS登録日': posDate ? String(posDate) : '',
        '備考欄': memo ? String(memo) : '',
        '担当者名': staffName ? String(staffName) : '',
        'Wチェック者名': checkerName ? String(checkerName) : '',
        '還元項目': item.type ? String(item.type) : '',
        '申込書番号': item.appNo ? String(item.appNo) : '',
        'セット割申番': item.subAppNo ? String(item.subAppNo) : '',
        '金額': amountNum,
      };

      if (mode === '即時') {
        record['POS業務伝票番号'] = posBillNo ? String(posBillNo) : '';
        record['お渡しカウンター'] = counterNo ? String(counterNo) : '';
      } else {
        record['還元方法'] = remittanceMethod ? String(remittanceMethod) : '';
      }

      return record;
    });

    // CELF一括登録仕様（テーブル名の中に配列を直置き）
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
        sentJson: payload,
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