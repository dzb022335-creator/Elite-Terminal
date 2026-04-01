const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const mockData = {
  btc: {
    symbol: "BTC",
    hasOpportunity: true,
    reason: "السعر قريب من منطقة دعم قوية على الفريم اليومي مع زيادة ملحوظة في حجم التداول.",
    entry: 84200,
    stopLoss: 83100,
    target: 86500,
    successRate: 74
  },
  sol: {
    symbol: "SOL",
    hasOpportunity: true,
    reason: "اختراق نموذج مثلث صاعد على فريم 4 ساعات ومؤشر RSI إيجابي.",
    entry: 145.5,
    stopLoss: 140.0,
    target: 158.0,
    successRate: 68
  },
  eth: {
    symbol: "ETH",
    hasOpportunity: false,
    reason: "السعر يقترب من مقاومة تاريخية قوية والزخم الحالي ضعيف، يفضل الانتظار.",
    entry: null,
    stopLoss: null,
    target: null,
    successRate: null
  }
};

const defaultResponse = (symbol) => ({
  symbol: symbol.toUpperCase(),
  hasOpportunity: false,
  reason: "السيولة الحالية ضعيفة في هذه العملة ولا يوجد اتجاه واضح لتحقيق صفقة آمنة.",
  entry: null,
  stopLoss: null,
  target: null,
  successRate: null
});

app.get('/api/analyze/:symbol', (req, res) => {
  const rawSymbol = req.params.symbol;

  if (!rawSymbol || rawSymbol.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'يرجى كتابة رمز العملة'
    });
  }

  const symbol = rawSymbol.trim().toLowerCase();

  // التعديل الجديد: منع الأرقام والرموز الغريبة
  if (!/^[a-zA-Z]+$/.test(symbol)) {
    return res.status(400).json({
      success: false,
      message: 'رمز العملة يجب أن يحتوي على حروف فقط'
    });
  }

  setTimeout(() => {
    const analysis = mockData[symbol] || defaultResponse(symbol);

    res.json({
      success: true,
      data: analysis
    });
  }, 1000);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
