const express = require('express');
const cors = require('cors');
const axios = require('axios');
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

// الصفحة الرئيسية مدمجة بشاشة كاملة وميزة النسخ
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
            * { box-sizing: border-box; }
            body {
                background-color: var(--bg-color);
                color: var(--text-color);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
            }
            
            /* الهيدر العلوي الصغير */
            header {
                background: #101018;
                border-bottom: 1px solid var(--neutral-border);
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                height: 60px;
            }
            h1 {
                color: var(--accent-color);
                font-size: 18px;
                margin: 0;
                text-transform: uppercase;
                text-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
            }
            .top-inputs {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .top-inputs input {
                background: #05050a;
                border: 1px solid #333;
                color: #fff;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                outline: none;
                width: 100px;
            }
            .top-inputs button {
                background: var(--accent-color);
                color: #000;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
            }
            
            /* الشات كامل الشاشة */
            #chat-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: var(--bg-color);
                overflow: hidden;
            }
            #chat-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            /* فقاعة الرسالة */
            .message-wrapper {
                display: flex;
                flex-direction: column;
                max-width: 85%;
            }
            .message-wrapper.user { align-self: flex-end; }
            .message-wrapper.ai { align-self: flex-start; }
            
            .msg-box {
                padding: 12px;
                border-radius: 12px;
                font-size: 14px;
                line-height: 1.5;
                white-space: pre-wrap;
                position: relative;
            }
            .user .msg-box {
                background: var(--chat-primary);
                color: #fff;
                border-bottom-right-radius: 2px;
            }
            .ai .msg-box {
                background: var(--card-bg);
                color: var(--text-color);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-bottom-left-radius: 2px;
            }
            
            /* زر النسخ */
            .copy-btn {
                align-self: flex-start;
                background: transparent;
                border: none;
                color: #666;
                font-size: 12px;
                cursor: pointer;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 3px;
                padding: 2px 5px;
                border-radius: 4px;
            }
            .copy-btn:hover { color: var(--accent-color); background: rgba(255,255,255,0.05); }
            
            /* الصندوق السفلي للكتابة */
            .chat-input-area {
                background: #101018;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                padding: 12px;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .chat-input-area input {
                flex: 1;
                background: #05050a;
                border: 1px solid #222;
                color: #fff;
                padding: 12px;
                border-radius: 10px;
                font-size: 14px;
                outline: none;
            }
            .chat-input-area input:focus { border-color: var(--chat-text); }
            .chat-input-area button {
                background: var(--chat-primary);
                color: #fff;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
            }
            
            /* جزء التحليل العائم (إذا نجح التحليل) */
            .analysis-result {
                background: #14141f;
                border-top: 1px solid var(--accent-color);
                padding: 15px;
                display: none;
            }
        </style>
    </head>
    <body>

        <header>
            <h1>NayroVex AI</h1>
            <div class="top-inputs">
                <input type="text" id="symbolInput" placeholder="btc, sol...">
                <button id="analyzeBtn">تحليل</button>
            </div>
        </header>

        <div id="chat-container">
            <div id="chat-messages"></div>
            
            <div class="chat-input-area">
                <input type="text" id="user-chat-input" placeholder="اكتب رسالتك لـ NayroVex...">
                <button onclick="sendMessageToAI()">إرسال</button>
            </div>
        </div>

        <script>
            window.onload = () => { addMessage("أهلاً بك يا صديقي! أنا مستعد لتحليل صفقاتك أو مناقشة أي موضوع تريده.", false); };

            function addMessage(text, isUser = false) {
                const chatMessages = document.getElementById('chat-messages');
                
                const wrapper = document.createElement('div');
                wrapper.classList.add('message-wrapper', isUser ? 'user' : 'ai');
                
                const msgBox = document.createElement('div');
                msgBox.classList.add('msg-box');
                msgBox.innerText = text;
                
                wrapper.appendChild(msgBox);
                
                // إضافة زر النسخ لرسائل الـ AI فقط
                if (!isUser) {
                    const copyBtn = document.createElement('button');
                    copyBtn.classList.add('copy-btn');
                    copyBtn.innerHTML = '📋 نسخ';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(text);
                        copyBtn.innerHTML = '✅ تم النسخ';
                        setTimeout(() => copyBtn.innerHTML = '📋 نسخ', 1500);
                    };
                    wrapper.appendChild(copyBtn);
                }
                
                chatMessages.appendChild(wrapper);
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
                    addMessage(data.reply || "⚠️ حدث خطأ في الاستجابة", false);
                } catch (error) {
                    addMessage("⚠️ فشل الاتصال بالسيرفر!", false);
                }
            }

            document.getElementById('user-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessageToAI(); });
            
            // زر التحليل (المؤقت الحقيقي)
            document.getElementById('analyzeBtn').addEventListener('click', async () => {
                const symbol = document.getElementById('symbolInput').value.trim();
                if(!symbol) return alert('أدخل رمز العملة!');
                
                addMessage(\`ما هو تحليلك لعملة \${symbol}؟\`, true);
                sendMessageToAIDirectly(\`أعطني تحليلاً لعملة \${symbol} فوراً بالأرقام كمتداول محترف.\`);
            });
            
            async function sendMessageToAIDirectly(customText) {
                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: customText })
                    });
                    const data = await response.json();
                    addMessage(data.reply || "⚠️ خطأ في الاستجابة", false);
                } catch (error) { addMessage("⚠️ فشل الاتصال!", false); }
            }
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
أنت NayroVex AI، مساعد ذكي ومحلل تقني محترف ومحاور جريء في أسواق العملات الرقمية.
تكلم باللغة العربية الفصحى بطريقة ذكية، ودودة ومختصرة جداً.

🚨 قواعد صارمة لشخصيتك وأسلوبك:
1. ممنوع منعا باتا تكرار الديباجة والمقدمة في كل رسالة (مثل: أنا أعتمد على SMC وغيرها..). ادخل في صلب الموضوع فوراً دون فلسفة زائدة.
2. إذا طلب منك المستخدم تحليلاً أو صفقة لعملة معينة، لا تتردد ولا تختلق أعذاراً لحماية نفسك! أعطه تحليلاً مبنياً على (SMC، السيولة، الـ Order Blocks، ومستويات الـ Fibonacci).
3. عندما يحدد لك المستخدم الفريم ونوع الصفقة، يجب أن تتضمن إجابتك أرقاماً واضحة لـ: (منطقة الدخول المرجحة، الأهداف المقترحة Target، ووقف الخسارة Stop Loss).
4. في نهاية ردك، اطرح سؤالاً عكسياً ذكياً ومحفزاً لفتح نقاش مستمر.

المحادثة السابقة للرجوع إليها:
${conversation}

الرد بالفصحى (NayroVex):`;

        const API_KEY = process.env.GEMINI_API_KEY || process.env.SECRET_KEY;
        if (!API_KEY) return res.status(500).json({ reply: "⚠️ مفتاح Gemini غير موجود." });

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

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`); });
