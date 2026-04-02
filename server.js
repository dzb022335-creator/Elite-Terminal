const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); 

const sessions = {}; 

setInterval(() => {
    const now = Date.now();
    for (const ip in sessions) {
        const session = sessions[ip];
        if (session.lastUsed && now - session.lastUsed > 1000 * 60 * 30) {
            delete sessions[ip];
        }
    }
}, 1000 * 60 * 5);

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>NayroVex Elite Terminal</title>
        <style>
            :root {
                --bg-color: #08080c;
                --card-bg: #11111a;
                --accent-color: #00ffcc;
                --text-color: #e0e0e6;
                --neutral-border: rgba(0, 255, 204, 0.15);
                --chat-primary: #0055ff;
            }
            * { box-sizing: border-box; }
            body {
                background-color: var(--bg-color);
                color: var(--text-color);
                font-family: 'Segoe UI', Roboto, sans-serif;
                margin: 0; padding: 0;
                display: flex; flex-direction: column;
                height: 100vh; overflow: hidden;
            }
            header {
                background: #0a0a0f;
                border-bottom: 1px solid var(--neutral-border);
                padding: 8px 15px;
                display: flex; justify-content: space-between; align-items: center;
                height: 55px; flex-shrink: 0;
            }
            h1 { color: var(--accent-color); font-size: 16px; margin: 0; font-weight: 800; }
            #chat-messages {
                flex: 1; padding: 15px;
                overflow-y: auto; display: flex;
                flex-direction: column; gap: 15px;
                padding-bottom: 90px;
                background: var(--bg-color);
            }
            .message-wrapper { display: flex; flex-direction: column; max-width: 85%; }
            .message-wrapper.user { align-self: flex-end; }
            .message-wrapper.ai { align-self: flex-start; }
            .msg-box {
                padding: 12px; border-radius: 12px;
                font-size: 14px; line-height: 1.5;
                white-space: pre-wrap; position: relative;
            }
            .user .msg-box { background: var(--chat-primary); color: #fff; border-bottom-right-radius: 2px; }
            .ai .msg-box { background: var(--card-bg); color: var(--text-color); border: 1px solid rgba(255, 255, 255, 0.04); border-bottom-left-radius: 2px; }
            
            .copy-btn {
                position: absolute; bottom: -18px; left: 5px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
                color: #777; font-size: 10px; cursor: pointer;
                padding: 2px 6px; border-radius: 4px;
                opacity: 0; transition: 0.2s;
            }
            .message-wrapper.ai:hover .copy-btn { opacity: 1; bottom: -20px; }
            .copy-btn:hover { color: var(--accent-color); }
            
            #image-preview-container {
                display: none; padding: 5px 15px;
                background: rgba(0,0,0,0.5); position: fixed;
                bottom: 65px; left: 0; width: 100%; z-index: 5;
                align-items: center; justify-content: space-between;
            }
            #image-preview { max-width: 50px; max-height: 50px; border-radius: 5px; border: 1px solid var(--accent-color); }
            
            /* ستايل مؤشر التحميل */
            .typing-indicator {
                display: none; align-self: flex-start;
                background: var(--card-bg); padding: 12px;
                border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.04);
                color: var(--accent-color); font-size: 12px; font-weight: bold;
            }
            .dots { display: inline-block; width: 5px; height: 5px; background: var(--accent-color); border-radius: 50%; animation: blink 1.4s infinite both; margin: 0 2px; }
            .dots:nth-child(2) { animation-delay: 0.2s; }
            .dots:nth-child(3) { animation-delay: 0.4s; }
            @keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

            .chat-input-area {
                background: #0a0a0f;
                border-top: 1px solid rgba(255, 255, 255, 0.03);
                padding: 10px; display: flex; gap: 8px; align-items: center;
                position: fixed; bottom: 0; left: 0; width: 100%; z-index: 10;
            }
            .chat-input-area input[type="text"] {
                flex: 1; background: #050508;
                border: 1px solid #1a1a24; color: #fff;
                padding: 10px; border-radius: 8px; font-size: 14px; outline: none;
            }
            .icon-btn { background: transparent; border: none; color: #777; font-size: 18px; cursor: pointer; padding: 5px; }
            .send-btn { background: var(--chat-primary); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        </style>
    </head>
    <body>

        <header>
            <h1>NayroVex Terminal</h1>
            <div style="display:flex; gap:5px;">
                <input type="text" id="symbolInput" placeholder="btc, sol..." style="width:60px; background:#050508; color:#fff; border:1px solid #1a1a24; border-radius:5px; padding:4px; font-size:12px;">
                <button id="analyzeBtn" style="background:var(--accent-color); color:#000; border:none; padding:4px 10px; border-radius:5px; font-weight:bold; font-size:12px;">حلل</button>
            </div>
        </header>

        <div id="chat-container">
            <div id="chat-messages"></div>
            
            <div id="typing-box" class="typing-indicator">
                جاري تحليل البيانات <span class="dots"></span><span class="dots"></span><span class="dots"></span>
            </div>

            <div id="image-preview-container">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img id="image-preview" src="" alt="Preview">
                    <span style="font-size:12px; color:#aaa;">تم ضغط الصورة تلقائياً ⚡</span>
                </div>
                <span style="color:red; cursor:pointer; font-weight:bold;" onclick="clearImage()">حذف ×</span>
            </div>

            <div class="chat-input-area">
                <button class="icon-btn" onclick="document.getElementById('imageInput').click()">📎</button>
                <input type="file" id="imageInput" accept="image/png, image/jpeg, image/webp" style="display:none;" onchange="handleImageUpload()">
                <input type="text" id="user-chat-input" placeholder="اكتب رسالتك لـ NayroVex...">
                <button class="send-btn" onclick="sendMessageToAI()">إرسال</button>
            </div>
        </div>

        <script>
            let currentBase64Image = null;

            window.onload = () => { addMessage("أهلاً بك! ارفع شارت تداول وسأقوم بتحليله لك فوراً.", false); };

            function addMessage(text, isUser = false, imageBase64 = null) {
                const chatMessages = document.getElementById('chat-messages');
                const wrapper = document.createElement('div');
                wrapper.classList.add('message-wrapper', isUser ? 'user' : 'ai');
                
                const msgBox = document.createElement('div');
                msgBox.classList.add('msg-box');
                
                if (isUser && imageBase64) {
                    const img = document.createElement('img');
                    img.src = imageBase64;
                    img.style.maxWidth = '100px'; img.style.borderRadius = '5px';
                    img.style.marginBottom = '5px'; img.style.display = 'block';
                    msgBox.appendChild(img);
                }

                const textSpan = document.createElement('span');
                textSpan.innerText = text;
                msgBox.appendChild(textSpan);
                wrapper.appendChild(msgBox);
                
                if (!isUser) {
                    const copyBtn = document.createElement('button');
                    copyBtn.classList.add('copy-btn');
                    copyBtn.innerHTML = '📋 نسخ';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(text);
                        copyBtn.innerHTML = '✅ تم';
                        setTimeout(() => copyBtn.innerHTML = '📋 نسخ', 1000);
                    };
                    wrapper.appendChild(copyBtn);
                }
                
                chatMessages.appendChild(wrapper);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            function handleImageUpload() {
                const file = document.getElementById('imageInput').files[0];
                if (!file) return;

                // التحقق الصارم من نوع الملف في المتصفح
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    alert('يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP فقط!');
                    document.getElementById('imageInput').value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        const max_size = 800;
                        if (width > height && width > max_size) { height *= max_size / width; width = max_size; }
                        else if (height > max_size) { width *= max_size / height; height = max_size; }

                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d'); // تم التصحيح هنا من 20d إلى 2d
                        ctx.drawImage(img, 0, 0, width, height);

                        currentBase64Image = canvas.toDataURL('image/jpeg', 0.7);
                        document.getElementById('image-preview').src = currentBase64Image;
                        document.getElementById('image-preview-container').style.display = 'flex';
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }

            function clearImage() {
                currentBase64Image = null;
                document.getElementById('imageInput').value = '';
                document.getElementById('image-preview-container').style.display = 'none';
            }

            async function sendMessageToAI() {
                const inputField = document.getElementById('user-chat-input');
                const loadingBox = document.getElementById('typing-box');
                const chatMessages = document.getElementById('chat-messages');
                let messageText = inputField.value.trim();
                
                if (!messageText && !currentBase64Image) return;

                if (!messageText && currentBase64Image) messageText = "حلل هذا الشارت مستخدماً الـ SMC والسيولة.";

                addMessage(messageText, true, currentBase64Image);
                inputField.value = '';
                
                const payload = { prompt: messageText };
                if (currentBase64Image) {
                    payload.image = currentBase64Image.split(',')[1];
                }

                clearImage();
                
                // إظهار مؤشر التحميل
                loadingBox.style.display = 'block';
                chatMessages.scrollTop = chatMessages.scrollHeight;

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    
                    loadingBox.style.display = 'none'; // إخفاء التحميل
                    simulateMultipleBubbles(data.reply);
                } catch (error) { 
                    loadingBox.style.display = 'none';
                    addMessage("⚠️ فشل الاتصال بالسيرفر!", false); 
                }
            }

            function simulateMultipleBubbles(fullText) {
                if (!fullText) return addMessage("⚠️ لم أتلق ردًا من AI.", false);
                const parts = fullText.split('\\n\\n').filter(p => p.trim() !== '');
                parts.forEach((part, index) => {
                    setTimeout(() => addMessage(part.trim(), false), index * 800);
                });
            }

            document.getElementById('user-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessageToAI(); });
            
            document.getElementById('analyzeBtn').addEventListener('click', async () => {
                const symbol = document.getElementById('symbolInput').value.trim();
                if(!symbol) return alert('أدخل رمز العملة!');
                addMessage(\`ما هو تحليلك لعملة \${symbol}؟\`, true);
                sendMessageToAIThroughAPI(\`أعطني تحليلاً لعملة \${symbol} كمتداول محترف.\`);
            });
            
            async function sendMessageToAIThroughAPI(customText) {
                const loadingBox = document.getElementById('typing-box');
                const chatMessages = document.getElementById('chat-messages');
                
                loadingBox.style.display = 'block';
                chatMessages.scrollTop = chatMessages.scrollHeight;

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: customText })
                    });
                    const data = await response.json();
                    loadingBox.style.display = 'none';
                    simulateMultipleBubbles(data.reply);
                } catch (error) { 
                    loadingBox.style.display = 'none';
                    addMessage("⚠️ فشل الاتصال!", false); 
                }
            }
        </script>
    </body>
    </html>
    `);
});

app.post('/api/chat', async (req, res) => {
    try {
        let userMessage = req.body.prompt;
        const imageBase64 = req.body.image; 
        
        const forwarded = req.headers['x-forwarded-for'];
        const userIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

        if (userMessage && userMessage.length > 500) userMessage = userMessage.slice(0, 500);

        if (!sessions[userIP]) sessions[userIP] = { history: [], lastUsed: Date.now() };
        sessions[userIP].lastUsed = Date.now();
        const history = sessions[userIP].history;

        history.push({ role: "user", text: userMessage || "أرسل صورة" });
        if (history.length > 10) sessions[userIP].history = history.slice(-10);

        const conversation = sessions[userIP].history
            .map(msg => `${msg.role === 'user' ? 'المستخدم' : 'NayroVex'}: ${msg.text}`)
            .join('\n');

        const prompt = `
أنت NayroVex AI، مساعد ذكي ومحلل تقني محترف ومحاور جريء في أسواق العملات الرقمية.
تكلم باللغة العربية الفصحى بطريقة ذكية، ودودة ومختصرة جداً.

🚨 قواعد صارمة جداً:
1. إذا قام المستخدم برفع صورة شارت، يجب أن يكون تحليلك مبنياً تماماً على ما تراه في الصورة مستخدماً Order Blocks والـ Liquidity.
2. لا تقم بتكرار الديباجة الطويلة في كل رسالة.
3. تفاعل واطرح أسئلة عكسية لفتح النقاش.

المحادثة السابقة للرجوع إليها:
${conversation}

الرد بالفصحى (NayroVex):`;

        const API_KEY = process.env.GEMINI_API_KEY || process.env.SECRET_KEY;
        if (!API_KEY) return res.status(500).json({ reply: "⚠️ مفتاح Gemini غير موجود." });

        const geminiParts = [];
        if (imageBase64) {
            geminiParts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });
        }
        geminiParts.push({ text: prompt });

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            { contents: [{ parts: geminiParts }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const reply = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ لم أستطع استخراج رد من الموديل.";
        
        sessions[userIP].history.push({ role: "assistant", text: reply });
        res.json({ reply });
        
    } catch (err) {
        console.error('API Error:', err.response ? err.response.data : err.message);
        res.status(500).json({ reply: "⚠️ حدث خطأ أثناء التفكير! ربما بسبب حجم الصورة أو مفتاح الـ API." });
    }
});

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`); });
