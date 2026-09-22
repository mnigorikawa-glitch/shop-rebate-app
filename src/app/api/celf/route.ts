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

    // 受付月（当月1日 yyyy/mm/dd 形式）
    const today = new Date();
    const receptionMonth = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/01`;

    // CELFテーブル構造（即時 / 後日）に100%一致させたレコード配列の生成
    const rawRecords = (items || []).map((item: any) => {
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
          'POS登録日': String(posDate || ''),
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
        return {
          '店舗名': String(storeName || ''),
          '代理店コード': String(agentCode || ''),
          '略称': String(posAbbr || ''),
          '受付月': receptionMonth,
          '部門コード': String(deptCode || ''),
          'POS登録日': String(posDate || ''),
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

    // 試行用構造（CELF公式の data ラッパー形式 / 配列直接形式）
    const payloadCandidates = [
      {
        [tableName]: {
          data: rawRecords,
        },
      },
      {
        [tableName]: rawRecords,
      },
    ];

    let lastStatus = 400;
    let lastResponseData: any = null;
    let isSuccess = false;

    for (const payload of payloadCandidates) {
      const response = await fetch(CELF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-CELF-API-KEY': CELF_API_KEY,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      lastStatus = response.status;
      const responseText = await response.text();

      try {
        lastResponseData = JSON.parse(responseText);
      } catch (e) {
        lastResponseData = { rawText: responseText };
      }

      if (response.ok) {
        isSuccess = true;
        break;
      }
    }

    if (!isSuccess) {
      return NextResponse.json({
        success: false,
        httpStatus: lastStatus,
        celfResponse: lastResponseData,
      });
    }

    return NextResponse.json({
      success: true,
      data: lastResponseData,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}