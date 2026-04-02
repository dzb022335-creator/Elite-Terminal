const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// الإعدادات الأساسية
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ذاكرة مستقلة لكل مستخدم لحفظ سياق المحادثة
const sessions = {}; 

// تنظيف الذاكرة تلقائياً كل 5 دقائق للجلسات الخاملة لأكثر من 30 دقيقة
setInterval(() => {
    const now = Date.now();
    for (const ip in sessions) {
        const session = sessions[ip];
        if (session.lastUsed && now - session.lastUsed > 1000 * 60 * 30) {
            delete sessions[ip];
        }
    }
}, 1000 * 60 * 5);

// 1. مسار الشات والدردشة الذكية
app.post('/api/chat', async (req, res) => {
    try {
        let userMessage = req.body.prompt;
        
        // استخراج الـ IP بشكل آمن لحماية الـ Sessions
        const forwarded = req.headers['x-forwarded-for'];
        const userIP = forwarded
            ? forwarded.split(',')[0].trim()
            : req.socket.remoteAddress;

        if (!userMessage) {
            return res.status(400).json({ reply: 'يرجى كتابة رسالة.' });
        }

        // نصيحة تقليص حجم الرسالة لحماية الـ Tokens
        if (userMessage.length > 500) {
            userMessage = userMessage.slice(0, 500);
        }

        // إنشاء هيكل الجلسة
        if (!sessions[userIP]) {
            sessions[userIP] = {
                history: [],
                lastUsed: Date.now()
            };
        }

        // تحديث وقت الاستخدام
        sessions[userIP].lastUsed = Date.now();
        const history = sessions[userIP].history;

        // إضافة رسالة المستخدم للذاكرة
        history.push({ role: "user", text: userMessage });

        // الاحتفاظ بآخر 10 رسائل فقط
        if (history.length > 10) {
            sessions[userIP].history = history.slice(-10);
        }

        const currentHistory = sessions[userIP].history;

        // بناء سياق المحادثة
        const conversation = currentHistory
            .map(msg => `${msg.role === 'user' ? 'المستخدم' : 'NayroVex'}: ${msg.text}`)
            .join('\n');

        // الـ Prompt المحدّث بالفصحى والمزود بميزة الجرأة
        const prompt = `
أنت NayroVex AI، مساعد ذكي ومحلل تقني محترف ومختص في العملات الرقمية.
تكلم باللغة العربية الفصحى بطريقة ذكية، ودودة ومختصرة.

🚨 قواعد هامة لشخصيتك:
1. إذا سألك المستخدم عن التداول، جاوبه بناءً على (SMC، تحليل السيولة، الـ Order Blocks، ومستويات الـ Fibonacci) كخبير متداول.
2. إذا كانت دردشة عامة، تفاعل كصديق ومستشار بالفصحى.
3. 🔥 ميزة الجرأة: لا تكتفِ بالرد فقط! في نهاية ردك، اطرح سؤالاً عكسياً ذكياً ومحفزاً يتعلق بموضوع كلامكم لفتح نقاش مستمر (مثلاً: ما رأيك في هذه الحركة السوقية؟ هل جربت استخدام Fibonacci من قبل؟ أو أسئلة فلسفية وعامة إذا كان الحديث عاماً).

المحادثة السابقة:
${conversation}

الرد باللغة العربية الفصحى مع سؤال تفاعلي في الأخير (NayroVex):
`;

        const API_KEY = process.env.GEMINI_API_KEY || process.env.SECRET_KEY;

        if (!API_KEY) {
            return res.status(500).json({
                reply: "⚠️ مفتاح Gemini غير موجود في إعدادات السيرفر."
            });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return res.status(500).json({ reply: "⚠️ عذراً، حدث خطأ أثناء التفكير!" });
        }

        const reply = data.candidates[0].content.parts[0].text;
        
        // حفظ رد الذكاء الاصطناعي في الـ History
        currentHistory.push({ role: "assistant", text: reply });

        res.json({ reply });

    } catch (err) {
        console.error('Full Chat API Error:', err); // الـ Logging الكامل لتتبع الخطأ
        res.status(500).json({ reply: "⚠️ حدث خطأ أثناء معالجة طلبك." });
    }
});

// 2. مسار جلب تحليلات العملات
app.get('/api/analyze/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        
        const dummyData = {
            success: true,
            data: {
                symbol: symbol,
                reason: `تم فحص العملة بناءً على مناطق الـ Order Block ومستويات الفيبوناتشي. العملة تظهر ارتداداً جيداً من منطقة سيولة قوية.`,
                entry: "66281.00",
                target: "71583.48",
                stopLoss: "63629.76"
            }
        };
        
        res.json(dummyData);
    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب البيانات.' });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
