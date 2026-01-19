import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic'; // Önbelleğe almayı engelle

// 1. Ayarları Yükle
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const geminiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

export async function GET(request: Request) {
    try {
        // Güvenlik: Cron Job Secret (Opsiyonel ama önerilir, şimdilik atlıyoruz)
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //   return new Response('Unauthorized', { status: 401 });
        // }

        console.log("📅 Haftalık rapor oluşturuluyor...");

        // 1. Son 7 günün verilerini çek
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: feedbacks, error } = await supabase
            .from('feedbacks')
            .select('*')
            .gte('created_at', oneWeekAgo.toISOString());

        if (error) throw new Error(error.message);

        if (!feedbacks || feedbacks.length === 0) {
            return NextResponse.json({ message: 'Bu hafta hiç feedback yok.' });
        }

        console.log(`📊 ${feedbacks.length} adet feedback bulundu.`);

        // 2. Veriyi AI için hazırla
        const feedbackText = feedbacks.map(f => `- "${f.feedback}" (Analiz: ${f.ai_analysis?.sentiment || '?'}, Kategori: ${f.ai_analysis?.category || '?'})`).join('\n');

        // 3. AI Analizi
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = `
            Aşağıda bir ürün için son 7 günde gelen kullanıcı geri bildirimleri var.
            Bir ürün yöneticisi (Product Manager) gibi davran ve haftalık bir özet rapor hazırla.
            
            Geri Bildirimler:
            ${feedbackText}
            
            Rapor Formatı (HTML):
            - <h1>Haftalık Özet</h1>
            - <strong>Genel Duygu Durumu:</strong> (Pozitif/Negatif ağırlıklı mı?)
            - <strong>Öne Çıkan Sorunlar:</strong> (Madde madde en çok şikayet edilenler)
            - <strong>Kritik Öneriler:</strong> (Ne yapmalıyız? Fiyat indirimi? Bug fix?)
            - <strong>Haftanın Skor Kartı:</strong> (10 üzerinden bir puan ver ve nedenini yaz)
            
            Lütfen HTML etiketleri kullanarak (ul, li, strong, h2 vb.) güzelce formatla.
        `;

        const result = await model.generateContent(prompt);
        const reportHtml = result.response.text();

        console.log("🧠 Rapor oluşturuldu.");

        // 4. Email Gönder
        const resend = new Resend(process.env.RESEND_API_KEY!);
        await resend.emails.send({
            from: 'InsightCatch <onboarding@resend.dev>',
            to: ['ustundagkaanekrem@gmail.com'], // DEĞİŞTİRİLECEK
            subject: `📅 Haftalık Özet Raporu (${new Date().toLocaleDateString()})`,
            html: reportHtml
        });

        console.log("📧 Rapor yollandı.");

        return NextResponse.json({ success: true, count: feedbacks.length });

    } catch (error: any) {
        console.error("Hata:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
