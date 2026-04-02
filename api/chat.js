import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    // تفعيل الـ CORS للسماح بالطلبات من الواجهة
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'الطريقة غير مسموح بها' });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'الرسالة فارغة!' });
    }

    // قراءة المفتاح من إعدادات Vercel
    const apiKey = process.env.GEMINI_API_KEY || process.env.SECRET_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح الـ API غير موجود في السيرفر!' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // أمر صارم لجعل الردود سريعة جداً لتفادي مهلة الـ 10 ثوانٍ في Vercel
                systemInstruction: "أنت خبير تداول ذكي ومساعد في Terminal. أجب دائماً باختصار شديد ومباشر (في سطرين أو ثلاثة فقط) لتجنب بطء السيرفر.",
                maxOutputTokens: 150,
            }
        });

        const replyText = response.text;
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'فشل السيرفر في توليد الرد.' });
    }
}
