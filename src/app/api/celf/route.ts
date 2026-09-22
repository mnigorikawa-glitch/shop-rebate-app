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

    // テーブル名の決定
    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';
    
    // CELF レコード作成 (POST) 用エンドポイント URL
    const CELF_API_URL = encodeURI(
      `https://api.cloud.celf.jp/v1/tables/${tableName}?company=${companyId}`
    );

    // CELFテーブルのカラム定義に合致するデータのみを抽出・整形
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

    // CELF登録APIのリクエストペイロード構築
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
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { rawText: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `CELF API Status ${response.status}: ${JSON.stringify(data)}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}