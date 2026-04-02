const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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
                flex-direction: column; gap: 24px;
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
            
            .ai.error-msg .msg-box { border: 1px solid var(--error-color); color: var(--error-color); }
            .ai.success-msg .msg-box { border: 1px solid var(--success-color); }

            .btn-group {
                display: flex; gap: 8px;
                position: absolute; bottom: -22px; left: 5px;
                opacity: 0; transition: 0.2s;
            }
            .message-wrapper.ai:hover .btn-group { opacity: 1; }
            
            .action-btn {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
                color: #777; font-size: 10px; cursor: pointer;
                padding: 2px 6px; border-radius: 4px;
            }
            .action-btn:hover { color: var(--accent-color); border-color: var(--accent-color); }
            
            .tooltip {
                position: absolute; background: #000; color: #fff;
                font-size: 11px; padding: 4px 8px; border-radius: 4px;
                bottom: 30px; left: 5px; opacity: 0; transition: 0.3s;
                pointer-events: none; border: 1px solid var(--accent-color);
            }
            .tooltip.show { opacity: 1; }
            
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

            /* نافذة المعاينة (Modal) */
            .modal-overlay {
                display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center;
            }
            .modal-content {
                background: var(--card-bg); width: 85%; max-width: 500px; max-height: 70vh;
                border: 1px solid var(--neutral-border); border-radius: 12px; padding: 20px;
                display: flex; flex-direction: column; gap: 15px;
            }
            .modal-header { font-weight: bold; color: var(--accent-color); border-bottom: 1px solid #1a1a24; padding-bottom: 10px; }
            .modal-body { overflow-y: auto; font-size: 12px; color: #aaa; background: #08080c; padding: 10px; border-radius: 8px; white-space: pre-wrap; flex: 1; }
            .modal-footer { display: flex; justify-content: flex-end; gap: 10px; }
            .modal-btn { padding: 6px 15px; border-radius: 5px; font-size: 12px; cursor: pointer; font-weight: bold; }
            .modal-btn.cancel { background: #222; color: #fff; border: 1px solid #333; }
            .modal-btn.confirm { background: var(--accent-color); color: #000; border: none; }
        </style>
    </head>
    <body>

        <header>
            <h1>NayroVex Terminal</h1>
            <div style="display:flex; gap:5px; align-items:center;">
                <button onclick="openSummaryModal()" style="background:transparent; border:1px solid var(--neutral-border); color:#aaa; padding:4px 8px; border-radius:5px; font-size:11px; cursor:pointer;">📥 تلخيص</button>
                <button onclick="clearFullSession()" style="background:transparent; border:1px solid #ff4a4a; color:#ff4a4a; padding:4px 8px; border-radius:5px; font-size:11px; cursor:pointer;">🗑️ مسح</button>
                <input type="text" id="symbolInput" placeholder="btc, sol..." style="width:50px; background:#050508; color:#fff; border:1px solid #1a1a24; border-radius:5px; padding:4px; font-size:12px;">
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

        <div class="modal-overlay" id="summaryModal">
            <div class="modal-content">
                <div class="modal-header">معاينة تلخيص الجلسة</div>
                <div class="modal-body" id="modalBodyText"></div>
                <div class="modal-footer">
                    <button class="modal-btn cancel" onclick="closeSummaryModal()">إلغاء</button>
                    <button class="modal-btn confirm" onclick="downloadChatHistory()">تحميل الملف</button>
                </div>
            </div>
        </div>

        <script>
            let currentBase64Image = null;
            
            // لحفظ الطلب الأخير بنسخته الكاملة (النص + الصورة إن وجدت)
            let lastUserRequest = { prompt: '', image: null }; 

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
                    img.style.maxWidth = '150px'; img.style.borderRadius = '5px';
                    img.style.marginBottom = '5px'; img.style.display = 'block';
                    img.onload = scrollToBottom; 
                    msgBox.appendChild(img);
                }

                const textSpan = document.createElement('span');
                textSpan.innerText = text;
                msgBox.appendChild(textSpan);
                wrapper.appendChild(msgBox);
                
                if (role === 'ai') {
                    const btnGroup = document.createElement('div');
                    btnGroup.classList.add('btn-group');

                    const copyBtn = document.createElement('button');
                    copyBtn.classList.add('action-btn');
                    copyBtn.innerHTML = '📋 نسخ';
                    
                    const tooltip = document.createElement('div');
                    tooltip.classList.add('tooltip');
                    tooltip.innerText = 'تم النسخ بنجاح! ✅';
                    wrapper.appendChild(tooltip);

                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(text);
                        tooltip.classList.add('show');
                        setTimeout(() => tooltip.classList.remove('show'), 1500);
                    };

                    const retryBtn = document.createElement('button');
                    retryBtn.classList.add('action-btn');
                    retryBtn.innerHTML = '🔄 إعادة التحليل';
                    retryBtn.onclick = () => {
                        if (lastUserRequest.prompt || lastUserRequest.image) {
                            addMessage(\`إعادة المحاولة: \${lastUserRequest.prompt || 'تحليل الشارت'}\`, "user", "normal", lastUserRequest.image);
                            executeFetchAI(lastUserRequest.prompt, lastUserRequest.image);
                        } else {
                            alert('لا يوجد طلب أخير لإعادة تحليله!');
                        }
                    };

                    btnGroup.appendChild(copyBtn);
                    btnGroup.appendChild(retryBtn);
                    wrapper.appendChild(btnGroup);
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

                        const max_size = 800; 
                        if (width > height && width > max_size) { height *= max_size / width; width = max_size; }
                        else if (height > max_size) { width *= max_size / height; height = max_size; }

                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        currentBase64Image = canvas.toDataURL('image/jpeg', 0.6);

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
                let messageText = inputField.value.trim();
                
                if (!messageText && !currentBase64Image) return;

                if (!messageText && currentBase64Image) {
                    messageText = "حلل هذا الشارت مستخدماً الـ SMC والسيولة.";
                }

                // حفظ الطلب كاملاً مع الصورة لإعادة التحليل الذكية
                lastUserRequest = { prompt: messageText, image: currentBase64Image };

                addMessage(messageText, "user", "normal", currentBase64Image);
                inputField.value = '';
                
                executeFetchAI(messageText, currentBase64Image);
                clearImage();
            }

            async function executeFetchAI(promptText, imageBase64 = null) {
                const loadingBox = document.getElementById('typing-box');
                const typingText = document.getElementById('typing-text');
                
                typingText.innerText = imageBase64 ? "جاري فحص الشارت وتحديد الـ Order Blocks" : "جاري التفكير وصياغة الرد";
                loadingBox.style.display = 'block';
                scrollToBottom();

                const payload = { prompt: promptText };
                if (imageBase64) {
                    payload.image = imageBase64.split(',')[1];
                }

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

            function simulateMultipleBubbles(fullText, statusType = "normal") {
                if (!fullText) return addMessage("⚠️ لم أتلق ردًا من AI.", "ai", "error");
                
                let parts = [];
                if (fullText.includes('\\n\\n')) {
                    parts = fullText.split('\\n\\n').filter(p => p.trim() !== '');
                } else {
                    const regex = /([^.؟!?]+[.؟!?]+)/g;
                    const matches = fullText.match(regex);
                    
                    if (matches) {
                        let tempChunk = '';
                        matches.forEach(match => {
                            tempChunk += match;
                            if (tempChunk.length > 200) {
                                parts.push(tempChunk.trim());
                                tempChunk = '';
                            }
                        });
                        if (tempChunk.trim()) parts.push(tempChunk.trim());
                    } else {
                        parts.push(fullText);
                    }
                }

                parts.forEach((part, index) => {
                    setTimeout(() => addMessage(part.trim(), "ai", statusType), index * 1000);
                });
            }

            // توليد نص الملخص
            function generateLogText() {
                const messages = document.querySelectorAll('.message-wrapper');
                let log = "--- NayroVex Terminal Chat Summary ---\\n\\n";
                messages.forEach(msg => {
                    const role = msg.classList.contains('user') ? "المستخدم" : "NayroVex";
                    const text = msg.querySelector('.msg-box span').innerText;
                    log += \`[\${role}]: \${text}\\n\\n\`;
                });
                return log;
            }

            // فتح نافذة المعاينة
            function openSummaryModal() {
                const modal = document.getElementById('summaryModal');
                const modalBody = document.getElementById('modalBodyText');
                modalBody.innerText = generateLogText();
                modal.style.display = 'flex';
            }

            function closeSummaryModal() {
                document.getElementById('summaryModal').style.display = 'none';
            }

            // تنزيل الملف
            function downloadChatHistory() {
                const log = generateLogText();
                const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'nayrovex_summary.txt';
                link.click();
                closeSummaryModal();
            }

            // حذف كل الجلسة من السيرفر ومن الواجهة
            async function clearFullSession() {
                if(!confirm("هل أنت متأكد من رغبتك في مسح كل سجل الجلسة؟")) return;
                
                try {
                    await fetch('/api/clear', { method: 'POST' });
                } catch (e) { console.error(e); }

                document.getElementById('chat-messages').innerHTML = '';
                lastUserRequest = { prompt: '', image: null };
                addMessage("تم مسح الجلسة، وبدء محادثة جديدة.", "ai", "success");
            }

            document.getElementById('user-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessageToAI(); });
            
            document.getElementById('analyzeBtn').addEventListener('click', async () => {
                const symbol = document.getElementById('symbolInput').value.trim();
                if(!symbol) return alert('أدخل رمز العملة!');
                const prompt = \`أعطني تحليلاً لعملة \${symbol} كمتداول محترف.\`;
                
                lastUserRequest = { prompt: prompt, image: null };
                
                addMessage(\`ما هو تحليلك لعملة \${symbol}؟\`, "user");
                executeFetchAI(prompt);
            });
        </script>
    </body>
    </html>
    `);
});

// إضافة مسار خاص لحذف جلسة الـ IP
app.post('/api/clear', (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const userIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    
    if (sessions[userIP]) {
        delete sessions[userIP];
    }
    res.json({ success: true });
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
        if (history.length > 6) sessions[userIP].history = history.slice(-6);

        const conversation = sessions[userIP].history
            .map(msg => `${msg.role === 'user' ? 'المستخدم' : 'NayroVex'}: ${msg.text}`)
            .join('\n');

        const prompt = `
أنت NayroVex AI، مساعد ذكي ومحلل تقني محترف ومحاور جريء في أسواق العملات الرقمية.
تكلم باللغة العربية الفصحى بطريقة ذكية، ودودة ومختصرة جداً.

🚨 قواعد صارمة جداً:
1. إذا قام المستخدم برفع صورة شارت، يجب أن يكون تحليلك مبنياً تماماً على ما تراه في الصورة مستخدماً Order Blocks والـ Liquidity.
2. لا تقم بتكرار الديباجة الطويلة في كل رسالة.

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
        res.status(500).json({ reply: "⚠️ حدث خطأ أثناء التفكير! ربما بسبب حجم الصورة أو انتهاء مهلة الـ 10 ثوانٍ في Vercel.", error: true });
    }
});

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`); });
