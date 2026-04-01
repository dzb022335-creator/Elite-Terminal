const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// قائمة بأسماء العملات الشائعة للربط مع CoinGecko
const coinMap = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  doge: "dogecoin",
  ada: "cardano",
  xrp: "ripple",
  bnb: "binancecoin"
};

app.get('/api/analyze/:symbol', async (req, res) => {
  const rawSymbol = req.params.symbol;

  // 1. التحقق من الفراغات
  if (!rawSymbol || rawSymbol.trim() === '') {
    return res.status(400).json({ success: false, message: 'يرجى كتابة رمز العملة' });
  }

  const symbol = rawSymbol.trim().toLowerCase();

  // 2. التحقق من الحروف فقط (حمايتك الخاصة)
  if (!/^[a-zA-Z]+$/.test(symbol)) {
    return res.status(400).json({ success: false, message: 'رمز العملة يجب أن يحتوي على حروف فقط' });
  }

  const coinId = coinMap[symbol];
  if (!coinId) {
    return res.status(400).json({ success: false, message: 'هذه العملة غير مدعومة حاليًا في النسخة التجريبية. جرب btc أو sol أو eth' });
  }

  try {
    // جلب البيانات الحقيقية من CoinGecko
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const data = response.data;

    const currentPrice = data.market_data.current_price.usd;
    const priceChange24h = data.market_data.price_change_percentage_24h;

    let hasOpportunity = false;
    let reason = "";
    let entry = null, stopLoss = null, target = null, successRate = null;

    // معادلة بسيطة حقيقية: إذا هبط السعر أكثر من 2% نعتبرها فرصة ارتداد
    if (priceChange24h < -2) {
      hasOpportunity = true;
      reason = `السعر هبط بنسبة ${priceChange24h.toFixed(2)}% في الـ 24 ساعة الأخيرة. يبدو أن العملة في منطقة دعم جيدة للشراء الارتدادي.`;
      
      entry = currentPrice;
      stopLoss = currentPrice * 0.96; // وقف خسارة 4%
      target = currentPrice * 1.08;   // هدف 8%
      successRate = 65;
    } else {
      hasOpportunity = false;
      reason = `العملة صعدت بالفعل بنسبة ${priceChange24h.toFixed(2)}% أو تتحرك بشكل عرضي، الدخول هنا قد يكون عالي المخاطرة.`;
    }

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        hasOpportunity,
        reason,
        entry: entry ? entry.toFixed(2) : null,
        stopLoss: stopLoss ? stopLoss.toFixed(2) : null,
        target: target ? target.toFixed(2) : null,
        successRate
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب البيانات الحقيقية من السوق.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
