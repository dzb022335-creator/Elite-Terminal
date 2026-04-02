const express = require('express');
const cors = require('cors');
const axios = require('axios'); // الاعتماد على أكسيوس لضمان استقرار فيرسل
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ذاكرة مستقلة لكل مستخدم
const sessions = {}; 

// تنظيف الذاكرة التلقائي
setInterval(() => {
    const now = Date.now();
    for (const ip in sessions) {
        const session = sessions[ip];
        if (session.lastUsed && now - session.lastUsed > 1000 * 60 * 30) {
            delete sessions[ip];
        }
    }
}, 1000 * 60 * 5);

// حل مشكلة Cannot GET / بعرض الواجهة مباشرة
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NayroVex Elite Terminal</title>
        <style>
            :root {
                --bg-color: #0a0a0f;
                --card-bg: #14141f;
                --accent-color: #00ffcc;
                --text-color: #e0e0e6;
                --danger-color: #ff3366;
                --success-color: #00ff88;
                --neutral-border: rgba(0, 255, 204, 0.2);
                --chat-primary: #0055ff;
                --chat-text: #00d2ff;
            }
            body {
                background-color: var(--bg-color);
                color: var(--text-color);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                width: 100%;
                max-width: 500px;
                background: var(--card-bg);
                padding: 20px;
                border-radius: 15px;
                border: 1px solid var(--neutral-border);
                margin-bottom: 20px;
                box-sizing: border-box;
            }
            h1 {
                text-align: center;
                color: var(--accent-color);
                font-size: 24px;
                margin-bottom: 20px;
                text-transform: uppercase;
                text-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
            }
            .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
            input { flex: 1; background: #0a0a0f; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 8px; font-size: 16px; outline: none; }
            input:focus { border-color: var(--accent-color); }
            button { background: var(--accent-color); color: #000; border: none; padding: 0 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; }
            button:hover { opacity: 0.9; box-shadow: 0 0 10px var(--accent-color); }
            
            #chat-container { width: 100%; max-width: 500px; background: var(--card-bg); border-radius: 15px; border: 1px solid var(--neutral-border); display: flex; flex-direction: column; height: 320px; }
            #chat-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
            .chat-input-group { display: flex; padding: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
            .result-box { background: #0a0a0f; padding: 15px; border-radius: 10px; margin-top: 15px; display: none; border: 1px solid #222; }
            .loading { text-align: center; color: var(--accent-color); display: none; margin-top: 10px; font-weight: bold; }
        </style>
    </head>
    <body>

        <div class="container">
            <h1>Elite Terminal AI</h1>
            <div class="input-group">
                <input type="text" id="symbolInput" placeholder="أدخل رمز العملة (مثال: btc, sol)">
                <button id="analyzeBtn">تحليل</button>
            </div>
            <div id="loading" class="loading">جاري استشارة الذكاء الاصطناعي...</div>
            <div id="resultBox" class="result-box">
                <h3 id="coinTitle" style="color: var(--accent-color); margin-top: 0;"></h3>
                <div id="aiReason" style="line-height: 1.6; max-height: 150px; overflow-y: auto;"></div>
                <hr style="border-color: #222;">
                <p>💰 سعر الدخول المقترح: <span id="entryPrice"></span></p>
                <p>🎯 الهدف (Target): <span id="targetPrice"></span></p>
                <p>🛑 وقف الخسارة: <span id="stopLoss"></span></p>
            </div>
        </div>

        <div id="chat-container">
            <div id="chat-messages"></div>
            <div class="chat-input-group">
                <input type="text" id="user-chat-input" placeholder="تحدث مع الذكاء الاصطناعي..." style="font-size: 14px;">
                <button onclick="sendMessageToAI()" style="padding: 0 15px; margin-right: 8px; background: var(--chat-primary); color: #fff;">إرسال</button>
            </div>
        </div>

        <script>
            window.onload = () => { addMessage("أهلاً بك! أنا NayroVex، اسألني عن التداول أو أي شيء آخر.", false); };

            function addMessage(text, isUser = false) {
                const chatMessages = document.getElementById('chat-messages');
                const msg = document.createElement('div');
                msg.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
                msg.style.background = isUser ? '#0055ff' : '#1a1a24';
                msg.style.color = isUser ? '#fff' : '#00d2ff';
                msg.style.padding = '8px 12px';
                msg.style.borderRadius = '8px';
                msg.style.maxWidth = '80%';
                msg.style.fontSize = '13px';
                msg.style.whiteSpace = 'pre-wrap';
                msg.textContent = text;
                chatMessages.appendChild(msg);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            async function sendMessageToAI() {
                const inputField = document.getElementById('user-chat-input');
                const messageText = inputField.value.trim();
                if (!messageText) return;

                addMessage(messageText, true);
                inputField.value = '';

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: messageText })
                    });
                    const data = await response.json();
                    addMessage(data.reply || "⚠️ خطأ في الاستجابة", false);
                } catch (error) {
                    addMessage("⚠️ فشل الاتصال بالسيرفر!", false);
                }
            }

            document.getElementById('user-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessageToAI(); });
            
            // ربط زر التحليل
            document.getElementById('analyzeBtn').addEventListener('click', async () => {
                const symbol = document.getElementById('symbolInput').value.trim();
                const loading = document.getElementById('loading');
                const resultBox = document.getElementById('resultBox');
                
                if(!symbol) { alert('الرجاء إدخال رمز العملة أولاً!'); return; }
                loading.style.display = 'block'; resultBox.style.display = 'none';

                try {
                    const response = await fetch(\`/api/analyze/\${symbol}\`);
                    const resData = await response.json();
                    loading.style.display = 'none';

                    if(resData.success) {
                        const data = resData.data;
                        document.getElementById('coinTitle').innerText = \`تحليل عملة \${data.symbol}\`;
                        document.getElementById('aiReason').innerText = data.reason;
                        document.getElementById('entryPrice').innerHTML = \`<span style="color: var(--success-color);">\${data.entry} $</span>\`;
                        document.getElementById('targetPrice').innerHTML = \`<span style="color: var(--success-color);">\${data.target} $</span>\`;
                        document.getElementById('stopLoss').innerHTML = \`<span style="color: var(--danger-color);">\${data.stopLoss} $</span>\`;
                        resultBox.style.display = 'block';
                    }
                } catch (error) { loading.style.display = 'none'; alert('خطأ في جلب التحليل.'); }
            });
        </script>
    </body>
    </html>
    `);
});

// مسار الشات المعدل والآمن بـ Axios
app.post('/api/chat', async (req, res) => {
    try {
        let userMessage = req.body.prompt;
        const forwarded = req.headers['x-forwarded-for'];
        const userIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

        if (!userMessage) return res.status(400).json({ reply: 'يرجى كتابة رسالة.' });
        if (userMessage.length > 500) userMessage = userMessage.slice(0, 500);

        if (!sessions[userIP]) sessions[userIP] = { history: [], lastUsed: Date.now() };
        sessions[userIP].lastUsed = Date.now();
        const history = sessions[userIP].history;

        history.push({ role: "user", text: userMessage });
        if (history.length > 10) sessions[userIP].history = history.slice(-10);

        const conversation = sessions[userIP].history
            .map(msg => `${msg.role === 'user' ? 'المستخدم' : 'NayroVex'}: ${msg.text}`)
            .join('\n');

        const prompt = `
أنت NayroVex AI، مساعد ذكي ومحلل تقني محترف ومختص في العملات الرقمية.
تكلم باللغة العربية الفصحى بطريقة ذكية، ودودة ومختصرة.
🚨 قواعد هامة:
1. إذا سألك المستخدم عن التداول، جاوبه بناءً على (SMC، تحليل السيولة، الـ Order Blocks، ومستويات الـ Fibonacci) كخبير متداول.
2. إذا كانت دردشة عامة، تفاعل كصديق ومستشار بالفصحى.
3. اطرح في نهاية ردك سؤالاً عكسياً ذكياً ومحفزاً لفتح نقاش مستمر.

المحادثة السابقة:
${conversation}

الرد بالفصحى (NayroVex):`;

        const API_KEY = process.env.GEMINI_API_KEY || process.env.SECRET_KEY;
        if (!API_KEY) return res.status(500).json({ reply: "⚠️ مفتاح Gemini غير موجود." });

        // التحدث مع Gemini باستخدام Axios بدلاً من fetch
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const reply = response.data.candidates[0].content.parts[0].text;
        sessions[userIP].history.push({ role: "assistant", text: reply });

        res.json({ reply });
    } catch (err) {
        console.error('API Error:', err.response ? err.response.data : err.message);
        res.status(500).json({ reply: "⚠️ حدث خطأ أثناء التفكير!" });
    }
});

// مسار التحليلات (الوهمي حالياً)
app.get('/api/analyze/:symbol', (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    res.json({
        success: true,
        data: {
            symbol: symbol,
            reason: `تم فحص العملة بناءً على مناطق الـ Order Block ومستويات الفيبوناتشي. العملة تظهر ارتداداً جيداً من منطقة سيولة قوية.`,
            entry: "66281.00", target: "71583.48", stopLoss: "63629.76"
        }
    });
});

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`); });
