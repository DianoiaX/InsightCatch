'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { AlertTriangle, Smile, Frown, Meh, Loader2 } from 'lucide-react';

// Supabase Ayarları
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Verileri Çek
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false }); // En yeniler üstte

      if (error) console.error('Hata:', error);
      else setFeedbacks(data || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // İstatistikleri Hesapla
  const total = feedbacks.length;
  const negativeCount = feedbacks.filter(f => f.ai_analysis?.sentiment === 'Negatif').length;
  const urgentCount = feedbacks.filter(f => f.ai_analysis?.urgency >= 4).length;

  // Grafik Verisi Hazırla
  const sentimentData = [
    { name: 'Pozitif', value: feedbacks.filter(f => f.ai_analysis?.sentiment === 'Pozitif').length, color: '#22c55e' },
    { name: 'Nötr', value: feedbacks.filter(f => f.ai_analysis?.sentiment === 'Nötr').length, color: '#94a3b8' },
    { name: 'Negatif', value: feedbacks.filter(f => f.ai_analysis?.sentiment === 'Negatif').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Üst Bar */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">InsightCatch</h1>
          <p className="text-gray-500">Müşteri Kayıp Analiz Paneli</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <span className="font-mono text-sm text-gray-400">Canlı Veri Akışı</span>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Toplam Geri Bildirim</h3>
          <p className="mt-2 text-4xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Mutsuz Müşteriler</h3>
          <p className="mt-2 text-4xl font-bold text-red-500">{negativeCount}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Acil Müdahale Gerekli</h3>
          <p className="mt-2 text-4xl font-bold text-orange-500">{urgentCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* SOL: Grafik Alanı */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Duygu Analizi</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            {sentimentData.map(d => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full" style={{ background: d.color }}></div>
                {d.name} (%{Math.round((d.value / total) * 100)})
              </div>
            ))}
          </div>
        </div>

        {/* SAĞ: Akış Listesi */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Son Geri Bildirimler</h2>
          <div className="space-y-4">
            {feedbacks.map((item) => {
              const analysis = item.ai_analysis || {};
              const isUrgent = analysis.urgency >= 4;

              return (
                <div key={item.id} className={`group relative rounded-lg border p-4 transition hover:shadow-md ${isUrgent ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      {/* Etiketler */}
                      <div className="mb-2 flex items-center gap-2">
                        {analysis.sentiment === 'Pozitif' && <Smile className="h-4 w-4 text-green-500" />}
                        {analysis.sentiment === 'Negatif' && <Frown className="h-4 w-4 text-red-500" />}
                        {analysis.sentiment === 'Nötr' && <Meh className="h-4 w-4 text-gray-500" />}

                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {analysis.category || 'Genel'}
                        </span>

                        {isUrgent && (
                          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Acil ({analysis.urgency}/5)
                          </span>
                        )}
                      </div>

                      {/* Özet ve Mesaj */}
                      <h4 className="font-semibold text-gray-900">{analysis.summary || 'Henüz analiz edilmedi...'}</h4>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">"{item.feedback}"</p>
                    </div>

                    <div className="text-right text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
