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
                --bg-color: #050508;
                --card-bg: #0b0b14;
                --accent-color: #00ffcc;
                --accent-glow: rgba(0, 255, 204, 0.4);
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
                background-image: radial-gradient(circle at 50% 50%, #0d111a 0%, #050508 100%);
            }
            header {
                background: rgba(10, 10, 15, 0.8);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid var(--neutral-border);
                padding: 8px 15px;
                display: flex; justify-content: space-between; align-items: center;
                height: 55px; flex-shrink: 0;
                box-shadow: 0 4px 20px rgba(0, 255, 204, 0.05);
            }
            h1 { color: var(--accent-color); font-size: 16px; margin: 0; font-weight: 800; text-shadow: 0 0 10px var(--accent-glow); }
            
            .futuristic-btn {
                background: linear-gradient(135deg, rgba(0, 255, 204, 0.1) 0%, rgba(0, 85, 255, 0.05) 100%);
                border: 1px solid var(--accent-color);
                color: #fff; font-size: 11px; font-weight: bold;
                text-transform: uppercase; letter-spacing: 1px;
                padding: 6px 12px; border-radius: 4px; cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 0 5px rgba(0, 255, 204, 0.2);
                display: inline-flex; align-items: center; gap: 5px;
            }
            .futuristic-btn:hover {
                background: linear-gradient(135deg, rgba(0, 255, 204, 0.2) 0%, rgba(0, 85, 255, 0.1) 100%);
                box-shadow: 0 0 15px var(--accent-glow);
                text-shadow: 0 0 5px #fff;
                transform: translateY(-1px);
            }
            
            .futuristic-btn.danger {
                border-color: var(--error-color);
                background: linear-gradient(135deg, rgba(255, 74, 74, 0.1) 0%, rgba(0, 0, 0, 0.5) 100%);
                color: #ffb3b3;
                box-shadow: 0 0 5px rgba(255, 74, 74, 0.2);
            }
            .futuristic-btn.danger:hover {
                background: linear-gradient(135deg, rgba(255, 74, 74, 0.2) 0%, rgba(0, 0, 0, 0.5) 100%);
                box-shadow: 0 0 15px rgba(255, 74, 74, 0.3);
            }

            #chat-messages {
                flex: 1; padding: 15px;
                overflow-y: auto; display: flex;
                flex-direction: column; gap: 24px;
                /* تعديل 1: زدنا الـ padding لكي تظهر الرسالة كاملة فوق حقل الإدخال */
                padding-bottom: 120px; 
                background: transparent;
                scroll-behavior: smooth;
            }
            .message-wrapper { display: flex; flex-direction: column; max-width: 85%; position: relative; }
            .message-wrapper.user { align-self: flex-end; }
            .message-wrapper.ai { align-self: flex-start; }
            
            .msg-box {
                padding: 12px; border-radius: 12px;
                font-size: 14px; line-height: 1.5;
                white-space: pre-wrap; word-break: break-word;
                backdrop-filter: blur(5px);
            }
            .user .msg-box { 
                background: linear-gradient(135deg, var(--chat-primary) 0%, #0033aa 100%); 
                color: #fff; border-bottom-right-radius: 2px;
                box-shadow: 0 4px 15px rgba(0, 85, 255, 0.2);
            }
            .ai .msg-box { 
                background: var(--card-bg); 
                color: var(--text-color); 
                border: 1px solid rgba(0, 255, 204, 0.05); 
                border-bottom-left-radius: 2px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            }
            
            .ai.error-msg .msg-box { border: 1px solid var(--error-color); color: var(--error-color); background: rgba(255, 74, 74, 0.05); }
            .ai.success-msg .msg-box { border: 1px solid var(--success-color); }

            .btn-group {
                display: flex; gap: 8px;
                position: absolute; bottom: -22px; left: 5px;
                opacity: 0; transition: 0.2s;
            }
            .message-wrapper.ai:hover .btn-group { opacity: 1; }
            
            .action-btn {
                background: rgba(11, 11, 20, 0.8);
                border: 1px solid rgba(0, 255, 204, 0.2);
                color: #00ffcc; font-size: 10px; cursor: pointer;
                padding: 2px 8px; border-radius: 4px;
                font-weight: bold; text-transform: uppercase;
            }
            .action-btn:hover { background: var(--accent-color); color: #000; box-shadow: 0 0 10px var(--accent-glow); }
            
            .tooltip {
                position: absolute; background: #000; color: #fff;
                font-size: 11px; padding: 4px 8px; border-radius: 4px;
                bottom: 30px; left: 5px; opacity: 0; transition: 0.3s;
                pointer-events: none; border: 1px solid var(--accent-color);
            }
            .tooltip.show { opacity: 1; }
            
            #image-preview-container {
                display: none; padding: 5px 15px;
                background: rgba(5, 5, 8, 0.9); position: fixed;
                bottom: 65px; left: 0; width: 100%; z-index: 5;
                align-items: center; justify-content: space-between;
                border-top: 1px solid var(--neutral-border);
            }
            #image-preview { max-width: 50px; max-height: 50px; border-radius: 5px; border: 1px solid var(--accent-color); box-shadow: 0 0 10px var(--accent-glow); }
            
            .typing-indicator {
                display: none; align-self: flex-start;
                background: var(--card-bg); padding: 12px;
                border-radius: 12px; border: 1px solid rgba(0, 255, 204, 0.1);
                color: var(--accent-color); font-size: 12px; font-weight: bold;
                text-shadow: 0 0 5px var(--accent-glow);
            }
            .dots { display: inline-block; width: 5px; height: 5px; background: var(--accent-color); border-radius: 50%; animation: blink 1.4s infinite both; margin: 0 2px; }
            .dots:nth-child(2) { animation-delay: 0.2s; }
            .dots:nth-child(3) { animation-delay: 0.4s; }
            @keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

            .chat-input-area {
                background: rgba(10, 10, 15, 0.9);
                backdrop-filter: blur(10px);
                border-top: 1px solid var(--neutral-border);
                padding: 10px; display: flex; gap: 8px; align-items: center;
                position: fixed; bottom: 0; left: 0; width: 100%; z-index: 10;
            }
            .chat-input-area input[type="text"] {
                flex: 1; background: #08080c;
                border: 1px solid #1a1a24; color: #fff;
                padding: 10px; border-radius: 8px; font-size: 14px; outline: none;
                transition: border 0.3s;
            }
            .chat-input-area input[type="text"]:focus { border-color: var(--accent-color); box-shadow: 0 0 10px rgba(0, 255, 204, 0.1); }
            
            .icon-btn { background: transparent; border: none; color: #777; font-size: 18px; cursor: pointer; padding: 5px; transition: 0.3s; }
            .icon-btn:hover { color: var(--accent-color); }
            
            .send-btn { 
                background: linear-gradient(135deg, var(--chat-primary) 0%, #0033aa 100%); 
                color: #fff; border: none; padding: 10px 18px; border-radius: 8px; 
                font-weight: bold; cursor: pointer; transition: 0.3s;
                text-transform: uppercase; letter-spacing: 1px; font-size: 12px;
                box-shadow: 0 4px 10px rgba(0, 85, 255, 0.2);
            }
            .send-btn:hover { box-shadow: 0 4px 15px rgba(0, 85, 255, 0.4); transform: translateY(-1px); }

            .modal-overlay {
                display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85); z-index: 100; align-items: center; justify-content: center;
                backdrop-filter: blur(5px);
            }
            .modal-content {
                background: #0b0b14; width: 85%; max-width: 500px; max-height: 70vh;
                border: 1px solid var(--accent-color); border-radius: 12px; padding: 20px;
                display: flex; flex-direction: column; gap: 15px;
                box-shadow: 0 0 30px rgba(0, 255, 204, 0.1);
            }
            .modal-header { font-weight: bold; color: var(--accent-color); border-bottom: 1px solid rgba(0, 255, 204, 0.1); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .modal-body { overflow-y: auto; font-size: 12px; color: #aaa; background: #050508; padding: 10px; border-radius: 8px; white-space: pre-wrap; flex: 1; border: 1px solid #111; }
            .modal-footer { display: flex; justify-content: flex-end; gap: 10px; }
        </style>
    </head>
    <body>

        <header>
            <h1>NayroVex Elite Terminal</h1>
            <div style="display:flex; gap:6px; align-items:center;">
                <button class="futuristic-btn" onclick="openSummaryModal()">📥 ملخص</button>
                <button class="futuristic-btn danger" onclick="clearFullSession()">🗑️ مسح</button>
                <input type="text" id="symbolInput" placeholder="btc" style="width:50px; background:#08080c; color:#fff; border:1px solid #1a1a24; border-radius:5px; padding:4px; font-size:12px; text-align:center;">
                <button id="analyzeBtn" class="futuristic-btn" style="color:#000; background:var(--accent-color);">حلل</button>
            </div>
        </header>

        <div id="chat-container">
            <div id="chat-messages"></div>
            
            <div id="typing-box" class="typing-indicator">
               <span id="typing-text">تحميل بيانات البروتوكول</span> <span class="dots"></span><span class="dots"></span><span class="dots"></span>
            </div>

            <div id="image-preview-container">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img id="image-preview" src="" alt="Preview">
                    <span style="font-size:11px; color:#aaa; font-family:monospace;">[ WEBP COMPRESSED ]</span>
                </div>
                <span style="color:var(--error-color); cursor:pointer; font-weight:bold; font-size:12px;" onclick="clearImage()">× حذف</span>
            </div>

            <div class="chat-input-area">
                <button class="icon-btn" onclick="document.getElementById('imageInput').click()">📎</button>
                <input type="file" id="imageInput" accept="image/*" style="display:none;" onchange="handleImageUpload()">
                <input type="text" id="user-chat-input" placeholder="أدخل الأمر أو الرسالة لـ NayroVex...">
                <button class="send-btn" onclick="sendMessageToAI()">إرسال</button>
            </div>
        </div>

        <div class="modal-overlay" id="summaryModal">
            <div class="modal-content">
                <div class="modal-header">📄 معاينة سجل الجلسة</div>
                <div class="modal-body" id="modalBodyText"></div>
                <div class="modal-footer">
                    <button class="futuristic-btn danger" onclick="closeSummaryModal()">إلغاء</button>
                    <button class="futuristic-btn" style="color:#000; background:var(--accent-color);" onclick="downloadChatHistory()">تحميل</button>
                </div>
            </div>
        </div>

        <script>
            let currentBase64Image = null;
            let lastUserRequest = { prompt: '', image: null }; 

            window.onload = () => { addMessage("تم تفعيل الاتصال بالنظام. ارفع شارت تداول وسأقوم بتحليله لك فوراً.", "ai", "success"); };

            // تعديل 2: تصحيح دالة السكرول لمنع الالتصاق والتحرك الإجباري
            function scrollToBottom() {
                const chatMessages = document.getElementById('chat-messages');
                
                // إذا كان المستخدم قد صعد للأعلى لقراءة شيء، لا نجبره على النزول
                const isUserReadingAbove = chatMessages.scrollHeight - chatMessages.clientHeight > chatMessages.scrollTop + 150;
                
                if (!isUserReadingAbove) {
                    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                }
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
                    img.style.border = '1px solid rgba(0, 255, 204, 0.2)';
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
                    retryBtn.innerHTML = '🔄 إعادة';
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

                if (file.size > 10 * 1024 * 1024) {
                    alert('ملف الصورة كبير جداً! الحد الأقصى المسموح به هو 10MB.');
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

                        const max_size = 600; 
                        if (width > height && width > max_size) { height *= max_size / width; width = max_size; }
                        else if (height > max_size) { width *= max_size / height; height = max_size; }

                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        currentBase64Image = canvas.toDataURL('image/webp', 0.4);

                        document.getElementById('image-preview').src = currentBase64Image;
                        document.getElementById('image-preview-container').style.display = 'flex';
                        
                        // تعديل 3: إجبار السكرول على النزول بعد اختيار الصورة لكي تظهر المعاينة
                        const chatMessages = document.getElementById('chat-messages');
                        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
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

                if (messageText.length > 500) {
                    alert('النص طويل جداً! الحد الأقصى هو 500 حرف.');
                    return;
                }

                lastUserRequest = { prompt: messageText, image: currentBase64Image };

                addMessage(messageText, "user", "normal", currentBase64Image);
                inputField.value = '';
                
                executeFetchAI(messageText, currentBase64Image);
                clearImage();
            }

            async function executeFetchAI(promptText, imageBase64 = null) {
                const loadingBox = document.getElementById('typing-box');
                const typingText = document.getElementById('typing-text');
                
                typingText.innerText = imageBase64 ? "فحص البروتوكول وتحديد الـ Blocks" : "صياغة تحليل الشبكة";
                loadingBox.style.display = 'block';
                
                // إجبار النزول لرؤية الـ loading
                const chatMessages = document.getElementById('chat-messages');
                chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });

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
                    addMessage("⚠️ فشل الاتصال بالسيرفر! الشبكة غير مستقرة.", "ai", "error"); 
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

            function openSummaryModal() {
                const modal = document.getElementById('summaryModal');
                const modalBody = document.getElementById('modalBodyText');
                modalBody.innerText = generateLogText();
                modal.style.display = 'flex';
            }

            function closeSummaryModal() {
                document.getElementById('summaryModal').style.display = 'none';
            }

            function downloadChatHistory() {
                const log = generateLogText();
                const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'nayrovex_summary.txt';
                link.click();
                closeSummaryModal();
            }

            async function clearFullSession() {
                if(!confirm("سيتم تصفير سجل الجلسة بالكامل. هل أنت متأكد؟")) return;
                
                try {
                    await fetch('/api/clear', { method: 'POST' });
                } catch (e) { console.error(e); }

                document.getElementById('chat-messages').innerHTML = '';
                lastUserRequest = { prompt: '', image: null };
                addMessage("تم تصفير السجل بنجاح. النظام جاهز مجدداً.", "ai", "success");
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

        const geminiContents = [];
        const parts = [];

        if (imageBase64) {
            parts.push({ inline_data: { mime_type: "image/webp", data: imageBase64 } });
        }
        parts.push({ text: prompt });

        geminiContents.push({ parts: parts });

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            { contents: geminiContents },
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
