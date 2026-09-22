import { NextResponse } from 'next/server';

// 当月の年月コード (例: 2026年9月 -> "2609")
function getYearMonthCode(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mode = body.mode || '即時';

    const tableName = mode === '即時' ? '即時cbデータtest' : '後日cbデータtest';
    const companyId = '340076c518';
    
    const rawUrl = process.env.CELF_API_URL 
      ? process.env.CELF_API_URL.replace(/即時cbデータtest|後日cbデータtest/, tableName)
      : `https://api.cloud.celf.jp/v1/tables/${tableName}/bulkinsert?company=${companyId}`;

    const CELF_API_KEY = process.env.CELF_API_KEY || '';
    const CELF_API_URL = encodeURI(rawUrl);

    const today = new Date().toISOString().split('T')[0];
    const items = Array.isArray(body.items) && body.items.length > 0 ? body.items : [];

    // 後日CB用の「振込No年月」と「振込No通番」の自動採番
    const ymCode = getYearMonthCode(); // 例: "2609"
    // タイムスタンプベースの仮通番生成（※CELF検索API開通までの重複防止用通番）
    const generatedSeqNo = Math.floor(Date.now() % 10000); 

    const records = items.map((item: any, idx: number) => {
      if (mode === '即時') {
        return {
          "店舗名": body.storeName || "au Style イオンモールつくば",
          "POS登録日": today,
          "POS業務伝票番号": body.posBillNo || '',
          "申込書番号": item.appNo || '',
          "還元内容": item.type || '',
          "セット割申番": item.subAppNo || '',
          "件数": 1,
          "還元金額": Number(item.amount) || 0,
          "出金者": body.staffName || '',
          "出金ダブルチェック": body.checkerName || '',
          "金銭お渡しカウンター": body.counterNo || '',
          "リスト入力者": body.staffName || '',
        };
      } else {
        return {
          "店舗名": body.storeName || "au Style イオンモールつくば",
          "POS登録日": today,
          "申込書番号": item.appNo || '',
          "還元内容": item.type || '',
          "セット割申番": item.subAppNo || '',
          "件数": 1,
          "振込No年月": ymCode, // 例: "2609"
          "振込No通番": generatedSeqNo + idx, // 連番
          "還元金額": Number(item.amount) || 0,
          "送金方法": body.remittanceMethod || '口座振替', // 新規追加項目
          "担当": body.staffName || '',
          "ダブルチェック": body.checkerName || '',
        };
      }
    });

    const payload = {
      [tableName]: records
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

    return NextResponse.json({
      success: true,
      mode,
      tableName,
      transferNo: `${ymCode}-${generatedSeqNo}`,
      recordCount: records.length,
      data: resData,
    });

  } catch (error: any) {
    console.error('CELF API サーバーエラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send data to CELF' },
      { status: 500 }
    );
  }
}