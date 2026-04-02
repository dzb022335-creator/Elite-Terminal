const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// تقييد الحجم لـ 4 ميجابايت كحد أقصى لحماية السيرفر من الانهيار
app.use(express.json({ limit: '4mb' })); 

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
                --error-color: #ff4a4a;
                --success-color: #00ffcc;
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
                scroll-behavior: smooth;
            }
            .message-wrapper { display: flex; flex-direction: column; max-width: 85%; position: relative; }
            .message-wrapper.user { align-self: flex-end; }
            .message-wrapper.ai { align-self: flex-start; }
            .msg-box {
                padding: 12px; border-radius: 12px;
                font-size: 14px; line-height: 1.5;
                white-space: pre-wrap; word-break: break-word;
            }
            .user .msg-box { background: var(--chat-primary); color: #fff; border-bottom-right-radius: 2px; }
            .ai .msg-box { background: var(--card-bg); color: var(--text-color); border: 1px solid rgba(255, 255, 255, 0.04); border-bottom-left-radius: 2px; }
            
            /* ألوان مخصصة حسب نوع الحالة */
            .ai.error-msg .msg-box { border: 1px solid var(--error-color); color: var(--error-color); }
            .ai.success-msg .msg-box { border: 1px solid var(--success-color); }

            .copy-btn {
                position: absolute; bottom: -20px; left: 5px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
                color: #777; font-size: 10px; cursor: pointer;
                padding: 2px 6px; border-radius: 4px;
                opacity: 0; transition: 0.2s;
            }
            .message-wrapper.ai:hover .copy-btn { opacity: 1; }
            .copy-btn:hover { color: var(--accent-color); }
            
            #image-preview-container {
                display: none; padding: 5px 15px;
                background: rgba(0,0,0,0.5); position: fixed;
                bottom: 65px; left: 0; width: 100%; z-index: 5;
                align-items: center; justify-content: space-between;
            }
            #image-preview { max-width: 50px; max-height: 50px; border-radius: 5px; border: 1px solid var(--accent-color); }
            
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
                <button id="analyzeBtn" style="background:var(--accent-color); color:#000; border:none; padding:4px 10px; border-radius:5px; font-weight:bold; font-size:12px; cursor:pointer;">حلل</button>
            </div>
        </header>

        <div id="chat-container">
            <div id="chat-messages"></div>
            
            <div id="typing-box" class="typing-indicator">
               <span id="typing-text">جاري تحليل البيانات</span> <span class="dots"></span><span class="dots"></span><span class="dots"></span>
            </div>

            <div id="image-preview-container">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img id="image-preview" src="" alt="Preview">
                    <span id="image-size-warning" style="font-size:12px; color:#aaa;">تم الضغط والتحويل لـ JPEG تلقائياً ⚡</span>
                </div>
                <span style="color:red; cursor:pointer; font-weight:bold;" onclick="clearImage()">حذف ×</span>
            </div>

            <div class="chat-input-area">
                <button class="icon-btn" onclick="document.getElementById('imageInput').click()">📎</button>
                <input type="file" id="imageInput" accept="image/*" style="display:none;" onchange="handleImageUpload()">
                <input type="text" id="user-chat-input" placeholder="اكتب رسالتك لـ NayroVex...">
                <button class="send-btn" onclick="sendMessageToAI()">إرسال</button>
            </div>
        </div>

        <script>
            let currentBase64Image = null;

            window.onload = () => { addMessage("أهلاً بك! ارفع شارت تداول وسأقوم بتحليله لك فوراً.", "ai", "success"); };

            function scrollToBottom() {
                const chatMessages = document.getElementById('chat-messages');
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            function addMessage(text, role = "ai", statusType = "normal", imageBase64 = null) {
                const chatMessages = document.getElementById('chat-messages');
                const wrapper = document.createElement('div');
                wrapper.classList.add('message-wrapper', role);
                
                if (statusType === "error") wrapper.classList.add('error-msg');
                if (statusType === "success") wrapper.classList.add('success-msg');
                
                const msgBox = document.createElement('div');
                msgBox.classList.add('msg-box');
                
                if (role === 'user' && imageBase64) {
                    const img = document.createElement('img');
                    img.src = imageBase64;
                    img.style.maxWidth = '100px'; img.style.borderRadius = '5px';
                    img.style.marginBottom = '5px'; img.style.display = 'block';
                    img.onload = scrollToBottom; // النزول لأسفل بعد اكتمال الصورة
                    msgBox.appendChild(img);
                }

                const textSpan = document.createElement('span');
                textSpan.innerText = text;
                msgBox.appendChild(textSpan);
                wrapper.appendChild(msgBox);
                
                if (role === 'ai') {
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
                scrollToBottom();
            }

            function handleImageUpload() {
                const file = document.getElementById('imageInput').files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        const max_size = 1000; // رفع الحجم الأقصى قليلاً لدقة أفضل
                        if (width > height && width > max_size) { height *= max_size / width; width = max_size; }
                        else if (height > max_size) { width *= max_size / height; height = max_size; }

                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // تحويل تلقائي لـ JPEG وتقليص الجودة لـ 70% لتقليل الوزن
                        currentBase64Image = canvas.toDataURL('image/jpeg', 0.7);
                        
                        // فحص الحجم في الواجهة
                        const sizeInMB = (currentBase64Image.length * (3/4)) / (1024 * 1024);
                        const warningSpan = document.getElementById('image-size-warning');
                        
                        if (sizeInMB > 3) {
                            warningSpan.innerText = "⚠️ حجم الصورة ضخم حتى بعد الضغط!";
                            warningSpan.style.color = "red";
                        } else {
                            warningSpan.innerText = "تم الضغط والتحويل لـ JPEG تلقائياً ⚡";
                            warningSpan.style.color = "#aaa";
                        }

                        document.getElementById('image-preview').src = currentBase64Image;
                        document.getElementById('image-preview-container').style.display = 'flex';
                        scrollToBottom();
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
                const typingText = document.getElementById('typing-text');
                
                let messageText = inputField.value.trim();
                
                if (!messageText && !currentBase64Image) return;

                if (!messageText && currentBase64Image) {
                    messageText = "حلل هذا الشارت مستخدماً الـ SMC والسيولة.";
                    typingText.innerText = "جاري فحص الشارت وتحديد الـ Order Blocks";
                } else {
                    typingText.innerText = "جاري التفكير وصياغة الرد";
                }

                addMessage(messageText, "user", "normal", currentBase64Image);
                inputField.value = '';
                
                const payload = { prompt: messageText };
                if (currentBase64Image) {
                    payload.image = currentBase64Image.split(',')[1];
                }

                clearImage();
                
                loadingBox.style.display = 'block';
                scrollToBottom();

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    
                    loadingBox.style.display = 'none';
                    
                    if (data.error) {
                        simulateMultipleBubbles(data.reply, "error");
                    } else {
                        simulateMultipleBubbles(data.reply, "success");
                    }
                } catch (error) { 
                    loadingBox.style.display = 'none';
                    addMessage("⚠️ فشل الاتصال بالسيرفر!", "ai", "error"); 
                }
            }

            // تعديل دالة المحاكاة لتقبل تقسيم النصوص الطويلة إذا لم توجد فواصل
            function simulateMultipleBubbles(fullText, statusType = "normal") {
                if (!fullText) return addMessage("⚠️ لم أتلق ردًا من AI.", "ai", "error");
                
                let parts = [];
                if (fullText.includes('\\n\\n')) {
                    parts = fullText.split('\\n\\n').filter(p => p.trim() !== '');
                } else {
                    // إذا لم توجد فواصل، قطّع النص كل 250 حرف دون كسر الكلمات
                    let text = fullText;
                    while (text.length > 0) {
                        if (text.length <= 250) {
                            parts.push(text);
                            break;
                        }
                        let chunk = text.slice(0, 250);
                        let lastSpace = chunk.lastIndexOf(' ');
                        
                        if (lastSpace > 150) {
                            parts.push(text.slice(0, lastSpace).trim());
                            text = text.slice(lastSpace).trim();
                        } else {
                            parts.push(chunk.trim());
                            text = text.slice(250).trim();
                        }
                    }
                }

                parts.forEach((part, index) => {
                    setTimeout(() => addMessage(part.trim(), "ai", statusType), index * 1000);
                });
            }

            document.getElementById('user-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessageToAI(); });
            
            document.getElementById('analyzeBtn').addEventListener('click', async () => {
                const symbol = document.getElementById('symbolInput').value.trim();
                if(!symbol) return alert('أدخل رمز العملة!');
                addMessage(\`ما هو تحليلك لعملة \${symbol}؟\`, "user");
                sendMessageToAIThroughAPI(\`أعطني تحليلاً لعملة \${symbol} كمتداول محترف.\`);
            });
            
            async function sendMessageToAIThroughAPI(customText) {
                const loadingBox = document.getElementById('typing-box');
                const typingText = document.getElementById('typing-text');
                
                typingText.innerText = "جاري التفكير وصياغة الرد";
                loadingBox.style.display = 'block';
                scrollToBottom();

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: customText })
                    });
                    const data = await response.json();
                    loadingBox.style.display = 'none';
                    
                    if (data.error) {
                        simulateMultipleBubbles(data.reply, "error");
                    } else {
                        simulateMultipleBubbles(data.reply, "success");
                    }
                } catch (error) { 
                    loadingBox.style.display = 'none';
                    addMessage("⚠️ فشل الاتصال!", "ai", "error"); 
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
        if (!API_KEY) return res.status(500).json({ reply: "⚠️ مفتاح Gemini غير موجود في بيئة الـ Node.", error: true });

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
        res.status(500).json({ reply: "⚠️ حدث خطأ أثناء التفكير! ربما بسبب حجم الصورة أو مفتاح الـ API.", error: true });
    }
});

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`); });
