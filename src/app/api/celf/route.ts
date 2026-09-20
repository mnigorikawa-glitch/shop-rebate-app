import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const CELF_API_URL = process.env.CELF_API_URL || '';
    const CELF_API_KEY = process.env.CELF_API_KEY || '';

    const payload = {
      application_number: body.applicationNumber,
      customer_name: body.customerName,
      total_amount: body.totalAmount,
      staff_name: body.staffName,
      issue_date: body.issueDate,
      items: body.items,
      signature_data: body.signatureData,
    };

    // URLが設定されていない場合はモック成功処理
    if (!CELF_API_URL) {
      console.log('CELF_API_URL未設定のためモック処理実行:', payload);
      return NextResponse.json({ success: true, message: 'Mock sent successfully (CELF_API_URL not set)' });
    }

    // CELFへのAPIリクエスト
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
      console.error('CELF API Error Details:', resData);
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
    console.error('CELF API Server Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send data to CELF' },
      { status: 500 }
    );
  }
}