const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 🌟 ميزتك المقترحة: تتبع الطلبات (Logging Middleware)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// خدمة الملفات الثابتة من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

const coinMap = {
  btc: "bitcoin", eth: "ethereum", sol: "solana",
  doge: "dogecoin", ada: "cardano", xrp: "ripple", bnb: "binancecoin"
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const data = response.data;

    const currentPrice = data.market_data.current_price.usd;
    const priceChange24h = data.market_data.price_change_percentage_24h;
    const high24h = data.market_data.high_24h.usd;
    const low24h = data.market_data.low_24h.usd;

    const geminiApiKey = process.env.SECRET_KEY; 
    let aiReason = "";

    if (geminiApiKey) {
      try {
        const aiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            contents: [{
              parts: [{
                text: `أنت خبير تحليل عملات رقمية محترف. قم بتحليل عملة ${symbol.toUpperCase()} بناءً على البيانات التالية:
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
        console.error("Gemini API Error:", aiErr.message);
      }
    }

    if (!aiReason) {
      if (priceChange24h < -2) {
        aiReason = `[تحليل رقمي تلقائي]: العملة هبطت بنسبة ${priceChange24h.toFixed(2)}% محققة قاعاً عند ${low24h}$ اليوم. هذا الهبوط قد يمثل فرصة ارتداد جيدة للمشترين بشرط الحفاظ على مناطق الدعم.`;
      } else {
        aiReason = `[تحليل رقمي تلقائي]: العملة مستقرة أو في حالة صعود بنسبة ${priceChange24h.toFixed(2)}%. الدخول في هذه المستويات قد ينطوي على مخاطرة، يفضل انتظار تصحيح أو جني أرباح قرب القمة اليومية ${high24h}$.`;
      }
    }

    let hasOpportunity = priceChange24h < -2;
    let entry = currentPrice;
    let stopLoss = currentPrice * 0.96;
    let target = currentPrice * 1.08;

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        hasOpportunity,
        reason: aiReason,
        entry: entry ? entry.toFixed(2) : null,
        stopLoss: stopLoss ? stopLoss.toFixed(2) : null,
        target: target ? target.toFixed(2) : null,
        successRate: hasOpportunity ? 65 : 40
      }
    });

  } catch (error) {
    if (error.response) {
      console.error("CoinGecko Error Response:", error.response.data);
    } else if (error.request) {
      console.error("CoinGecko No Response:", error.request);
    } else {
      console.error("Request Setup Error:", error.message);
    }
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب بيانات السوق الحقيقية.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
