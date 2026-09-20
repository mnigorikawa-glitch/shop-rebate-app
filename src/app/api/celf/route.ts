import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const CELF_API_URL = process.env.CELF_API_URL || '';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // 今日の日付 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // 還元内容の項目テキストを連結（例: "当日特典キャッシュバック / 独自特典"）
    const itemTypes = Array.isArray(body.items) 
      ? body.items.map((i: any) => i.type).join(' / ') 
      : '';

    // CELFテーブル「即時cbデータtest」のカラム名に厳密に合わせたオブジェクト
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

    // 一括登録(bulkinsert)用データ構造
    const payload = {
      data: [record]
    };

    if (!CELF_API_URL) {
      console.log('CELF_API_URL未設定のためモック処理実行:', payload);
      return NextResponse.json({ success: true, message: 'Mock sent successfully' });
    }

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