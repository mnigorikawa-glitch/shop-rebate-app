import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawUrl = process.env.CELF_API_URL || 'https://api.cloud.celf.jp/v1/tables/即時cbデータtest/bulkinsert?company=340076c518';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // URLに含まれる日本語テーブル名を自動エンコード
    const CELF_API_URL = encodeURI(rawUrl);

    const today = new Date().toISOString().split('T')[0];

    const itemTypes = Array.isArray(body.items) 
      ? body.items.map((i: any) => i.type).join(' / ') 
      : '';

    // CELFテーブルの各カラム
    const record: Record<string, any> = {
      "店舗名": "au Style イオンモールつくば",
      "POS登録日": today,
      "申込書番号": body.applicationNumber || '',
      "還元内容": itemTypes,
      "件数": 1,
      "還元金額": Number(body.totalAmount) || 0,
      "出金者": body.staffName || '',
      "リスト入力者": body.staffName || '',
    };

    // CELF一括登録仕様: { "テーブル名": [ レコード配列 ] }
    const payload = {
      "即時cbデータtest": [record]
    };

    const response = await fetch(CELF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CELF-API-KEY': CELF_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const resText = await response.text();
    let resData;
    try {
      resData = JSON.parse(resText);
    } catch {
      resData = resText;
    }

    if (!response.ok) {
      console.error('CELF API エラー詳細:', resData);
      return NextResponse.json(
        {
          success: false,
          error: `CELF API Status ${response.status}: ${typeof resData === 'string' ? resData : JSON.stringify(resData)}`
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: resData });

  } catch (error: any) {
    console.error('CELF API サーバーエラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send data to CELF' },
      { status: 500 }
    );
  }
}