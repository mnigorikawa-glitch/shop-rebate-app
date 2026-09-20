import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const CELF_API_URL = process.env.CELF_API_URL || '';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // CELFのテーブルに送信する1件分のレコードデータ
    const record = {
      application_number: body.applicationNumber,
      customer_name: body.customerName,
      total_amount: body.totalAmount,
      staff_name: body.staffName,
      issue_date: body.issueDate,
      signature_data: body.signatureData,
    };

    // 一括登録(bulkinsert)の仕様に合わせて配列形式にラップ
    const payload = {
      data: [record]
    };

    // URLが未設定の場合のダミー処理
    if (!CELF_API_URL) {
      console.log('CELF_API_URL未設定のためモック処理実行:', payload);
      return NextResponse.json({ success: true, message: 'Mock sent successfully (CELF_API_URL not set)' });
    }

    // CELFへのAPIリクエスト送信
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