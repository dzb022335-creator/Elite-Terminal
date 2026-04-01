// 1. دالة موحدة لإضافة الرسائل لتقليل تكرار الكود
function addMessage(text, isUser = false) {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `
        <div style="
            align-self: ${isUser ? 'flex-end' : 'flex-start'};
            background: ${isUser ? '#0055ff' : '#1a1a24'};
            color: ${isUser ? '#fff' : '#00d2ff'};
            padding: 8px 12px; 
            border-radius: 8px; 
            max-width: 80%;
            font-size: 13px; 
            text-align: right; 
            line-height: 1.5;
            border-left: ${isUser ? 'none' : '3px solid #0055ff'};
        ">
            ${text}
        </div>
    `;
    // النزول لأسفل الشات تلقائياً
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 2. الدالة الأساسية لإرسال واستقبال الرسائل
async function sendMessageToAI() {
    const inputField = document.getElementById('user-chat-input');
    const messageText = inputField.value.trim();
    
    if (messageText === '') return;

    // إظهار رسالة المستخدم في الشات
    addMessage(messageText, true);
    
    // تفريغ حقل الكتابة
    inputField.value = '';

    // إظهار مؤشر الانتظار
    const chatMessages = document.getElementById('chat-messages');
    const loadingId = 'loading-' + Date.now();
    chatMessages.innerHTML += `
        <div id="${loadingId}" style="align-self: flex-start; background: #1a1a24; color: #00d2ff; padding: 8px 12px; border-radius: 8px; max-width: 80%; font-size: 13px; text-align: right; border-left: 3px solid #0055ff;">
            جاري التفكير... ⏳
        </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        let response;
        
        // فحص ما إذا كان المستخدم يطلب تحليل عملة مباشرة (مثال: تحليل BTC أو SOL)
        const coinMatch = messageText.match(/تحليل\s+(\w+)/i);
        
        if (coinMatch) {
            const symbol = coinMatch[1].toUpperCase();
            // استدعاء الـ API الخاص بالتحليل مباشرة
            response = await fetch(`/api/analyze/${symbol}`);
            const data = await response.json();
            
            // حذف مؤشر الانتظار
            document.getElementById(loadingId)?.remove();
            
            // عرض نتيجة التحليل
            addMessage(`📊 **تحليل عملة ${symbol}**:\n${data.data.reason}`);
        } else {
            // إذا كان كلاماً عاماً، نرسله للـ API المفتوح
            response = await fetch('https://your-api-link.com/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: messageText })
            });
            const data = await response.json();
            
            // حذف مؤشر الانتظار
            document.getElementById(loadingId)?.remove();
            
            // عرض رد البوت
            addMessage(data.reply);
        }

    } catch (error) {
        document.getElementById(loadingId)?.remove();
        addMessage("⚠️ حدث خطأ في الاتصال بالسيرفر! تأكد من إعدادات الـ API.", false);
    }
}

// 3. دعم الضغط على Enter للإرسال و Shift+Enter لسطر جديد
document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById('user-chat-input');
    if (inputField) {
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // منع كسر السطر
                sendMessageToAI();
            }
        });
    }
});
