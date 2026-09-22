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
      totalAmount,
      items,
    } = body;

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const companyId = '340076c518';

    // 対象テーブル名の決定
    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';

    // CELFテーブルのカラム定義に合わせたデータ整形
    const records = (items || []).map((item: any) => {
      const baseRecord: any = {
        店舗名: storeName || '',
        代理店コード: agentCode || '',
        略称: posAbbr || '',
        部門コード: deptCode || '',
        POS登録日: posDate || '',
        備考欄: memo || '',
        担当者名: staffName || '',
        Wチェック者名: checkerName || '',
        還元項目: item.type || '',
        申込書番号: item.appNo || '',
        セット割申番: item.subAppNo || '',
        金額: item.amount || 0,
      };

      if (mode === '即時') {
        baseRecord['POS業務伝票番号'] = posBillNo || '';
        baseRecord['お渡しカウンター'] = counterNo || '';
      } else {
        baseRecord['還元方法'] = remittanceMethod || '';
      }

      return baseRecord;
    });

    const payload = {
      [tableName]: records,
    };

    // 試行するCELF登録APIのエンドポイント候補
    const candidateUrls = [
      encodeURI(`https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`),
      encodeURI(`https://api.cloud.celf.jp/v1/tables/${tableName}/record?company=${companyId}`),
      encodeURI(`https://api.cloud.celf.jp/v1/tables/${tableName}/records?company=${companyId}`),
    ];

    let lastResponseText = '';
    let lastStatus = 400;
    let isSuccess = false;
    let responseData: any = null;

    // サポートされているエンドポイントへ順次リクエストを試行
    for (const url of candidateUrls) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CELF-API-KEY': CELF_API_KEY,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      lastStatus = response.status;
      lastResponseText = await response.text();

      try {
        responseData = JSON.parse(lastResponseText);
      } catch (e) {
        responseData = { rawText: lastResponseText };
      }

      if (response.ok) {
        isSuccess = true;
        break;
      }

      // 405 Method Not Allowed の場合は別のエンドポイントURLで再試行
      if (response.status !== 405) {
        break;
      }
    }

    if (!isSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: `CELF API Status ${lastStatus}: ${JSON.stringify(responseData)}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}