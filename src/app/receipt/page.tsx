'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceiptPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState('au Style イオンモールつくば');

  // ログイン画面で選択された店舗名を自動読み込み
  useEffect(() => {
    const savedStore = sessionStorage.getItem('selectedStore');
    if (savedStore) {
      setStoreName(savedStore);
    }
  }, []);

  // ... (以降は以前の受領書画面コードと同じ。ヘッダー部分に「メニューへ戻る」ボタンを追加)