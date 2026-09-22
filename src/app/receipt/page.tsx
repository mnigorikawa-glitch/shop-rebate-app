// --- 送信処理 ---
const handleSubmit = async () => {
    if (!staffName) return alert('担当者名を入力してください。');
    if (mode === '即時' && !posBillNo) return alert('POS業務伝票番号を入力してください。');
    if (items.some((item) => !item.isExisting && !item.appNo))
      return alert('全ての還元内訳に申込書番号を入力（または既存を選択）してください。');
    if (!signatureData) return alert('お客様署名（サイン）をお願いいたします。');

    setIsSending(true);

    try {
      const formattedItems = items.map((item) => {
        const finalAppNo = item.isExisting ? item.existingPlan : item.appNo;

        return {
          type: item.type === 'その他（手入力）' ? item.customType : item.type,
          appNo: finalAppNo,
          subAppNo: isSetDiscountSupported(item.type) ? item.subAppNo : '',
          amount: Number(item.amount) || 0,
        };
      });

      const formattedPosDate = posDate ? posDate.replace(/-/g, '/') : '';

      const payload = {
        mode,
        storeName,
        agentCode: storeInfo.agentCode || '',
        posAbbr: storeInfo.posAbbr || '',
        deptCode: storeInfo.deptCode || '',
        customerName,
        posDate: formattedPosDate,
        memo,
        remittanceMethod: mode === '後日' ? remittanceMethod : '',
        staffName,
        checkerName,
        counterNo: mode === '即時' ? counterNo : '',
        posBillNo: mode === '即時' ? posBillNo : '',
        totalAmount,
        items: formattedItems,
        summary: aggregatedSummary,
      };

      const res = await fetch('/api/celf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        // CELF詳細エラーダイアログ出力
        const errDetail = data.celfResponse 
          ? JSON.stringify(data.celfResponse) 
          : (data.error || '不明なエラーが発生しました');
        throw new Error(`CELF連携失敗 (Status: ${data.httpStatus || 'unknown'}): ${errDetail}`);
      }

      alert(`受領書を保存しました。 (振込No: ${data.data?.transferNo || '即時処理'})`);
      window.print();
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };