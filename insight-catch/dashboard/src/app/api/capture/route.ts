import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';

// CORS Ayarları (Tekrar tekrar yazmamak için)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// 1. Ayarları Yükle
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const geminiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("📥 Gelen Feedback:", body.feedback);

        if (!body.feedback) {
            return NextResponse.json({ error: 'Feedback boş' }, { status: 400, headers: corsHeaders });
        }

        // ADIM A: Önce Ham Veriyi Kaydet (Hız için)
        let recordId = null;
        try {
            const { data: insertData, error: insertError } = await supabase
                .from('feedbacks')
                .insert([{ feedback: body.feedback, url: body.url }])
                .select()
                .single();

            if (insertError) throw new Error(insertError.message);
            recordId = insertData.id;
            console.log("✅ DB'ye kaydedildi. ID:", recordId);
        } catch (dbError) {
            console.error("❌ DB Kayıt Hatası (Süreç devam ediyor):", dbError);
        }

        // ADIM B: Arka Planda AI Analizi Başlat (Kullanıcıyı bekletmemek için try-catch içinde)
        let analysisResult = null;
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const prompt = `
        Bir web sitesi kullanıcısı çıkarken şu geri bildirimi bıraktı: "${body.feedback}"
        
        Lütfen bu geri bildirimi analiz et ve JSON formatında şu yanıtı ver:
        {
          "sentiment": "Pozitif" | "Nötr" | "Negatif",
          "category": "Fiyat" | "UX" | "İçerik" | "Teknik" | "Diğer",
          "summary": "Tek cümlelik Türkçe özet",
          "urgency": 1-5 arası aciliyet puanı (5 çok acil)
        }
      `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // JSON temizliği (Gemini bazen markdown ```json ... ``` döner)
            const cleanedJson = responseText.replace(/```json|```/g, '').trim();
            analysisResult = JSON.parse(cleanedJson);

            console.log("🧠 AI Analizi Bitti:", analysisResult);

            // ADIM C: Analiz Sonucunu DB'ye Güncelle (Eğer DB kaydı başarılıysa)
            if (recordId) {
                const { error: updateError } = await supabase
                    .from('feedbacks')
                    .update({
                        ai_analysis: analysisResult,
                        is_analyzed: true
                    })
                    .eq('id', recordId);

                if (updateError) console.error("Update Hatası:", updateError);
            }

        } catch (aiError) {
            console.error("⚠️ AI Analizi sırasında hata:", aiError);
        }

        // ADIM D: Email Bildirimi (Opsiyonel ama Etkili)
        // Eğer analiz yapıldıysa ve durum acilse mail at
        if (analysisResult) {
            const isUrgent = analysisResult.urgency >= 3; // Test için eşiği düşürdüm (4 -> 3)
            const isNegative = analysisResult.sentiment === 'Negatif' || analysisResult.sentiment === 'Negative'; // İngilizce de gelebilir

            if (isUrgent || isNegative) {
                console.log("🔥 Acil Durum! Mail atılıyor...");
                try {
                    const resend = new Resend(process.env.RESEND_API_KEY!);
                    const emailResponse = await resend.emails.send({
                        from: 'InsightCatch <onboarding@resend.dev>', // Production'da domain doğrulaması gerekir
                        to: ['ustundagkaanekrem@gmail.com'], // Test modunda sadece kendi mailinize atabilirsiniz
                        subject: `🚨 Yeni Feedback: ${analysisResult.sentiment} - ${analysisResult.category}`,
                        html: `
                        <h2>Yeni bir geri bildirim geldi!</h2>
                        <p><strong>URL:</strong> ${body.url}</p>
                        <p><strong>Mesaj:</strong> "${body.feedback}"</p>
                        <hr/>
                        <h3>AI Analizi:</h3>
                        <ul>
                            <li><strong>Duygu:</strong> ${analysisResult.sentiment}</li>
                            <li><strong>Kategori:</strong> ${analysisResult.category}</li>
                            <li><strong>Aciliyet:</strong> ${analysisResult.urgency}/5</li>
                            <li><strong>Özet:</strong> ${analysisResult.summary}</li>
                        </ul>
                        <p><small>(Veritabanı Durumu: ${recordId ? 'Kaydedildi' : 'KAYDEDİLEMEDİ'})</small></p>
                        `
                    });
                    console.log("📧 Mail gönderildi!", emailResponse);
                } catch (emailError) {
                    console.error("Mail gönderme hatası:", emailError);
                }
            }
        }

        // Kullanıcıya yanıt dön
        return NextResponse.json({ message: 'İşlem Tamamlandı', dbStatus: recordId ? 'OK' : 'FAIL' }, { status: 200, headers: corsHeaders });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}
