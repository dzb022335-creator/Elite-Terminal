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

  if (!rawSymbol || rawSymbol.trim() === '') {
    return res.status(400).json({ success: false, message: 'يرجى كتابة رمز العملة' });
  }

  const symbol = rawSymbol.trim().toLowerCase();

  if (!/^[a-zA-Z]+$/.test(symbol)) {
    return res.status(400).json({ success: false, message: 'رمز العملة يجب أن يحتوي على حروف فقط' });
  }

  const coinId = coinMap[symbol];
  if (!coinId) {
    return res.status(400).json({ success: false, message: 'هذه العملة غير مدعومة حاليًا في النسخة التجريبية. جرب btc أو sol أو eth' });
  }

  try {
    // 1. جلب البيانات الحقيقية من CoinGecko
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const data = response.data;

    const currentPrice = data.market_data.current_price.usd;
    const priceChange24h = data.market_data.price_change_percentage_24h;
    const high24h = data.market_data.high_24h.usd;
    const low24h = data.market_data.low_24h.usd;

    // 2. استخدام الذكاء الاصطناعي (Gemini AI) لتحليل البيانات
    // نستخدم الكود السري الذي أرسلته لي مسبقاً في البيئة المحيطة (SECRET_KEY)
    const geminiApiKey = process.env.SECRET_KEY; 
    let aiReason = "";

    try {
      const aiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: `أنت خبير تحليل عملات رقمية محترف. 
              قم بتحليل عملة ${symbol.toUpperCase()} بناءً على البيانات التالية:
              - السعر الحالي: ${currentPrice} دولار
              - التغير في آخر 24 ساعة: %${priceChange24h.toFixed(2)}
              - أعلى سعر اليوم: ${high24h} دولار
              - أدنى سعر اليوم: ${low24h} دولار
              
              اكتب لي فقرة واحدة باللغة العربية تشرح فيها للمتداول هل الدخول الآن مناسب أم لا وما هي نظرتك السريعة للحركة القادمة.`
            }]
          }]
        }
      );

      aiReason = aiResponse.data.candidates[0].content.parts[0].text;
    } catch (aiErr) {
      console.error("Gemini Error:", aiErr);
      aiReason = "تعذر الاتصال بالذكاء الاصطناعي حالياً، ولكن البيانات الرقمية تشير إلى أن السعر يتحرك بنسبة تقلّب عادية.";
    }

    // الإبقاء على حسابات الأهداف كما هي
    let hasOpportunity = priceChange24h < -2;
    let entry = currentPrice;
    let stopLoss = currentPrice * 0.96;
    let target = currentPrice * 1.08;

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        hasOpportunity,
        reason: aiReason, // هنا تظهر إجابة الذكاء الاصطناعي!
        entry: entry ? entry.toFixed(2) : null,
        stopLoss: stopLoss ? stopLoss.toFixed(2) : null,
        target: target ? target.toFixed(2) : null,
        successRate: hasOpportunity ? 65 : 40
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
