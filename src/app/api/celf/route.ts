import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Vercelの環境変数からAPIキーとエンドポイントを取得（後ほど設定）
    const CELF_API_URL = process.env.CELF_API_URL || 'https://api.cloud.celf.jp/v1/bulkinsert'; // 仮URL
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    // CELFへの送信データ構造を作成
    const payload = {
      application_number: body.applicationNumber,
      customer_name: body.customerName,
      total_amount: body.totalAmount,
      staff_name: body.staffName,
      issue_date: body.issueDate,
      items: body.items,
      signature_data: body.signatureData, // サイン画像データ(Base64)
    };

    // APIキーが存在する場合、実際のCELF APIへリクエストを送信
    if (CELF_API_KEY) {
      const response = await fetch(CELF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CELF-API-KEY': CELF_API_KEY, // CELFの指定ヘッダーに合わせて変更可能
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`CELF API Error: ${response.statusText}`);
      }

      const resData = await response.json();
      return NextResponse.json({ success: true, data: resData });
    }

    // 環境変数がまだ設定されていない場合のモック（疑似成功）レスポンス
    console.log('CELF送信データ（デバッグ用）:', payload);
    return NextResponse.json({ success: true, message: 'Mock sent successfully' });

  } catch (error: any) {
    console.error('CELF API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send data to CELF' },
      { status: 500 }
    );
  }
}