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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🌟 دالتك الذكية المعدلة لتنسيق الأرقام العشرية بشكل مثالي
const formatPrice = (price) => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6); // للعملات المتوسطة مثل DOGE و XRP
  return price.toFixed(8); // لعملات الميم ذات الأصفار الكثيرة
};

// 🌟 ذاكرة التخزين المؤقت (Cache)
const cache = {};

app.get('/api/analyze/:symbol', async (req, res) => {
  const rawSymbol = req.params.symbol;
  if (!rawSymbol || rawSymbol.trim() === '') {
    return res.status(400).json({ success: false, message: 'يرجى كتابة رمز العملة' });
  }

  const symbol = rawSymbol.trim().toLowerCase();
  if (!/^[a-zA-Z0-9]+$/.test(symbol)) {
    return res.status(400).json({ success: false, message: 'رمز العملة يجب أن يحتوي على حروف وأرقام فقط' });
  }

  // فحص الكاش: إذا طُلبت نفس العملة خلال أقل من 60 ثانية، يُرد فوراً بدون استدعاء API
  if (
    cache[symbol] &&
    Date.now() - cache[symbol].timestamp < 60000
  ) {
    console.log(`[Cache Hit] Serving ${symbol} from memory.`);
    return res.json(cache[symbol].data);
  }

  try {
    // 🔍 البحث عن معرف العملة الفعلي في CoinGecko بناءً على الرمز المكتوب
    const searchResponse = await axios.get(`https://api.coingecko.com/api/v3/search?query=${symbol}`);
    const coinsList = searchResponse.data.coins;

    // إعطاء الأولوية للعملات المشهورة التي تملك Rank
    const matchedCoin = coinsList.find(
      c => c.symbol.toLowerCase() === symbol && c.market_cap_rank
    ) || coinsList.find(
      c => c.symbol.toLowerCase() === symbol
    );

    if (!matchedCoin) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على هذه العملة. تأكد من كتابة الرمز بشكل صحيح (مثال: storj, dcr, dash)' });
    }

    const coinId = matchedCoin.id;

    // 🌟 التعديل الجديد: جلب بيانات العملة مع مهلة 8 ثوانٍ لتجنب التعليق
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}`,
      { timeout: 8000 }
    );
    const data = response.data;

    const currentPrice = data.market_data.current_price.usd;

    // التحقق الآمن لأسعار الصفر المطلق في العملات الرخيصة
    if (currentPrice === undefined || currentPrice === null) {
      return res.status(404).json({
        success: false,
        message: 'لا توجد بيانات سعر لهذه العملة حالياً'
      });
    }

    // التعامل الآمن مع غياب أعلى وأدنى سعر في 24 ساعة
    const priceChange24h = data.market_data.price_change_percentage_24h || 0;
    const high24h = data.market_data.high_24h?.usd || currentPrice;
    const low24h = data.market_data.low_24h?.usd || currentPrice;

    const geminiApiKey = process.env.SECRET_KEY; 
    let aiReason = "";

    if (geminiApiKey) {
      try {
        // إضافة مهلة 8 ثوانٍ لطلب Gemini لمنع البطء
        const aiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            contents: [{
              parts: [{
                text: `أنت خبير تحليل عملات رقمية محترف. قم بتحليل عملة ${symbol.toUpperCase()} بناءً على البيانات التالية:
                - السعر الحالي: ${formatPrice(currentPrice)} دولار
                - التغير في آخر 24 ساعة: %${priceChange24h.toFixed(2)}
                - أعلى سعر اليوم: ${formatPrice(high24h)} دولار
                - أدنى سعر اليوم: ${formatPrice(low24h)} دولار
                اكتب لي فقرة واحدة باللغة العربية تشرح فيها للمتداول هل الدخول الآن مناسب أم لا وما هي نظرتك السريعة للحركة القادمة.`
              }]
            }]
          },
          { timeout: 8000 }
        );
        aiReason = aiResponse.data.candidates[0].content.parts[0].text;
      } catch (aiErr) {
        console.error("Gemini API Error or Timeout:", aiErr.message);
      }
    }

    // التحليل البديل التلقائي في حال فشل الذكاء الاصطناعي أو تأخره
    if (!aiReason) {
      if (priceChange24h < -2) {
        aiReason = `[تحليل رقمي تلقائي]: العملة هبطت بنسبة ${priceChange24h.toFixed(2)}% محققة قاعاً عند ${formatPrice(low24h)}$ اليوم. هذا الهبوط قد يمثل فرصة ارتداد جيدة للمشترين بشرط الحفاظ على مناطق الدعم.`;
      } else {
        aiReason = `[تحليل رقمي تلقائي]: العملة مستقرة أو في حالة صعود بنسبة ${priceChange24h.toFixed(2)}%. الدخول في هذه المستويات قد ينطوي على مخاطرة، يفضل انتظار تصحيح أو جني أرباح قرب القمة اليومية ${formatPrice(high24h)}$.`;
      }
    }

    let hasOpportunity = priceChange24h < -2;
    let entry = currentPrice;
    let stopLoss = currentPrice * 0.96;
    let target = currentPrice * 1.08;

    // تجميع النتيجة النهائية لتخزينها في الكاش
    const result = {
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        hasOpportunity,
        reason: aiReason,
        entry: entry !== null ? formatPrice(entry) : null,
        stopLoss: stopLoss !== null ? formatPrice(stopLoss) : null,
        target: target !== null ? formatPrice(target) : null,
        successRate: hasOpportunity ? 65 : 40
      }
    };

    // حفظ البيانات في الكاش مع توقيت الحفظ
    cache[symbol] = {
      data: result,
      timestamp: Date.now()
    };

    res.json(result);

  } catch (error) {
    // 🌟 التعديل الجديد: إرسال رد واضح في حالة حظر CoinGecko للطلبات الكثيرة (Rate Limit)
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'تم تجاوز حد الطلبات، انتظر دقيقة ثم حاول مرة أخرى.'
      });
    }

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
