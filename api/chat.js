// 1. دالة موحدة لإضافة الرسائل
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 2. الدالة الأساسية لإرسال واستقبال الرسائل
async function sendMessageToAI() {
    const inputField = document.getElementById('user-chat-input');
    const messageText = inputField.value.trim();
    
    if (messageText === '') return;

    addMessage(messageText, true);
    inputField.value = '';

    const chatMessages = document.getElementById('chat-messages');
    const loadingId = 'loading-' + Date.now();
    chatMessages.innerHTML += `
        <div id="${loadingId}" style="align-self: flex-start; background: #1a1a24; color: #00d2ff; padding: 8px 12px; border-radius: 8px; max-width: 80%; font-size: 13px; text-align: right; border-left: 3px solid #0055ff;">
            جاري التفكير... ⏳
        </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // تم توجيه كل الطلبات لملف الـ chat السليم لتفادي الأخطاء
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: messageText })
        });
        
        const data = await response.json();
        
        document.getElementById(loadingId)?.remove();
        
        if (data.reply) {
            addMessage(data.reply);
        } else if (data.error) {
            addMessage("⚠️ السيرفر شغال ولكن هناك مشكلة في المفتاح أو الـ API.");
        } else {
            addMessage("⚠️ رد غير مفهوم من السيرفر!");
        }

    } catch (error) {
        document.getElementById(loadingId)?.remove();
        addMessage("⚠️ حدث خطأ! قد تكون المهلة انتهت أو السيرفر غير مستقر.", false);
    }
}

// 3. دعم الضغط على Enter للإرسال
document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById('user-chat-input');
    if (inputField) {
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageToAI();
            }
        });
    }
});
