import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
        const { data: insertData, error: insertError } = await supabase
            .from('feedbacks')
            .insert([{ feedback: body.feedback, url: body.url }])
            .select()
            .single(); // Tek satır döndür

        if (insertError) throw new Error(insertError.message);

        const recordId = insertData.id;
        console.log("✅ DB'ye kaydedildi. ID:", recordId);

        // ADIM B: Arka Planda AI Analizi Başlat (Kullanıcıyı bekletmemek için try-catch içinde)
        // Not: Normalde bunu "Background Job" yapar ama MVP için burada yapıyoruz.
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
            const analysisResult = JSON.parse(cleanedJson);

            console.log("🧠 AI Analizi Bitti:", analysisResult);

            // ADIM C: Analiz Sonucunu DB'ye Güncelle
            const { error: updateError } = await supabase
                .from('feedbacks')
                .update({
                    ai_analysis: analysisResult,
                    is_analyzed: true
                })
                .eq('id', recordId);

            if (updateError) console.error("Update Hatası:", updateError);

        } catch (aiError) {
            console.error("⚠️ AI Analizi sırasında hata:", aiError);
            // AI hata verse bile kullanıcıya "Başarılı" dönmeliyiz, çünkü veri kaydedildi.
        }

        // Kullanıcıya yanıt dön
        return NextResponse.json({ message: 'Kaydedildi ve Analiz Edildi' }, { status: 200, headers: corsHeaders });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}
