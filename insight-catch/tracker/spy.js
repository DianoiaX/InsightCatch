/**
 * InsightCatch - The Spy v0.1
 * Bu script müşterinin sitesine gömülecek.
 */
(function (window, document) {
    'use strict';

    // Ayarlar (İleride bunları sunucudan çekeceğiz)
    const CONFIG = {
        threshold: 20, // Mouse yukarıdan kaç piksel yaklaşınca tetiklensin?
        debug: true,   // Konsola log basayım mı?
        apiUrl: 'https://insightcatch.vercel.app/api/capture', // Next.js API adresi
        minTime: 10,   // Saniye
        minScroll: 50  // Yüzde
    };

    let hasTriggered = false; // Kullanıcıyı spamlamamak için bayrak
    let startTime = Date.now();
    let maxScroll = 0;

    // Başlatıcı
    function init() {
        if (CONFIG.debug) console.log(`🕵️ InsightCatch Ajanı göreve hazır. (Smart Mode: >${CONFIG.minTime}s OR >${CONFIG.minScroll}%)`);

        // Masaüstü için çıkış niyeti (Mouse yukarı kaçarsa)
        document.addEventListener('mouseleave', handleExitIntent);

        // Scroll takibi
        document.addEventListener('scroll', () => {
            const scrollPercentage = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
            if (scrollPercentage > maxScroll) maxScroll = scrollPercentage;
        });

        // Mobil için (Şimdilik basit bir scroll mantığı - V2'de geliştireceğiz)
        // document.addEventListener('scroll', handleScrollIntent);
    }

    // Olay Yakalayıcı
    function handleExitIntent(e) {
        if (hasTriggered) return;

        // Smart Trigger Kontrolleri
        const timeSpent = (Date.now() - startTime) / 1000; // Saniye cinsinden
        const deepScroll = maxScroll > CONFIG.minScroll;
        const longStay = timeSpent > CONFIG.minTime;

        if (!deepScroll && !longStay) {
            if (CONFIG.debug) console.log(`⏳ Henüz erken: ${Math.floor(timeSpent)}sn, %${Math.floor(maxScroll)} scroll.`);
            return;
        }

        // Eğer mouse tarayıcı penceresinin üst kısmına (adres çubuğuna) giderse
        if (e.clientY < CONFIG.threshold) {
            triggerAction();
        }
    }

    // Aksiyon (Modal Göster / Veri Gönder)
    function triggerAction() {
        hasTriggered = true;
        if (CONFIG.debug) console.log("🚀 Exit Intent Tespit Edildi! Aksiyon alınıyor...");
        createModal();
    }

    function getQuestionByContext() {
        const path = window.location.pathname; // URL'in devamı (örn: /fiyatlar)

        // 1. Ödeme Sayfası (En Kritik Yer)
        if (path.includes('checkout') || path.includes('sepet') || path.includes('cart')) {
            return {
                title: "Ödemede bir sorun mu var? 💳",
                options: ["Kargo çok pahalı", "Güvenemedim", "Teknik hata aldım", "Kupon kodum çalışmadı"]
            };
        }

        // 2. Fiyatlandırma Sayfası
        if (path.includes('pricing') || path.includes('fiyat')) {
            return {
                title: "Fiyatlar aklına yatmadı mı? 🤔",
                options: ["Bütçemi aşıyor", "Rakipler daha ucuz", "Özellikler yetersiz", "Sadece meraktan baktım"]
            };
        }

        // 3. Blog / İçerik Sayfası
        if (path.includes('blog') || path.includes('guide')) {
            return {
                title: "Aradığın cevabı bulamadın mı? 📚",
                options: ["İçerik yetersiz", "Çok uzun/karışık", "Yanlış yere gelmişim", "Farklı bir şey arıyordum"]
            };
        }

        // 4. Varsayılan (Anasayfa vs.)
        return {
            title: "Gitmeden önce küçük bir soru... 👋",
            options: ["Aradığımı bulamadım", "Fiyatları görmek istedim", "Tasarımı inceliyordum", "Diğer"]
        };
    }

    function createModal() {
        const context = getQuestionByContext();

        // Seçenekleri HTML butonlarına çevir
        const optionsHtml = context.options.map(opt =>
            `<button class="ic-option-btn" style="margin:5px; padding:8px; border:1px solid #ddd; background:white; cursor:pointer; width:100%; border-radius:5px;">${opt}</button>`
        ).join('');

        const modal = document.createElement('div');
        modal.id = 'insight-catch-modal';
        modal.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:99999;">
            <div style="background:white; padding:25px; border-radius:12px; max-width:400px; width:90%; box-shadow:0 10px 30px rgba(0,0,0,0.2); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h3 style="margin-top:0; color:#111; font-size:18px; text-align:center;">${context.title}</h3>
                
                <div id="ic-options-container" style="margin-top:15px;">
                    ${optionsHtml}
                </div>

                <textarea id="ic-text-feedback" placeholder="Lütfen kısaca açıkla..." style="display:none; width:100%; margin-top:10px; padding:10px; border:1px solid #ddd; border-radius:5px; min-height:60px;"></textarea>
                
                <div style="margin-top:15px; text-align:right;">
                    <button id="ic-close" style="background:transparent; border:none; color:#666; cursor:pointer; margin-right:10px;">Vazgeç</button>
                    <button id="ic-send" style="background:#2563EB; color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:600;">Gönder</button>
                </div>
                
                <a href="https://insightcatch.vercel.app" target="_blank" style="display:block; text-align:center; margin-top:15px; font-size:10px; color:#aaa; text-decoration:none;">
                    Powered by InsightCatch ⚡
                </a>
            </div>
        </div>`;

        document.body.appendChild(modal);

        // --- Etkileşim Kodları ---
        let selectedOption = "";

        // Seçenek butonu tıklama
        const optionBtns = modal.querySelectorAll('.ic-option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                // Diğerlerinin stilini sıfırla
                optionBtns.forEach(b => b.style.borderColor = "#ddd");
                optionBtns.forEach(b => b.style.background = "white");

                // Seçileni boya
                this.style.borderColor = "#2563EB";
                this.style.background = "#EFF6FF";

                selectedOption = this.innerText;

                // Textarea göster
                document.getElementById('ic-text-feedback').style.display = 'block';
            });
        });

        // Kapat
        document.getElementById('ic-close').onclick = () => removeModal(modal);

        // Gönder
        document.getElementById('ic-send').onclick = () => {
            const textFeedback = document.getElementById('ic-text-feedback').value;
            const finalFeedback = selectedOption + (textFeedback ? ": " + textFeedback : "");

            if (!selectedOption && !textFeedback) {
                alert("Lütfen bir seçenek seçin veya yazın.");
                return;
            }

            const submitBtn = document.getElementById('ic-send');
            submitBtn.innerText = "Gönderiliyor...";
            submitBtn.disabled = true;

            // API'ye İstek At
            fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feedback: finalFeedback,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (CONFIG.debug) console.log("✅ Sunucu Cevabı:", data);
                    alert("Teşekkürler! Geri bildiriminiz alındı.");
                    removeModal(modal);
                })
                .catch(error => {
                    console.error("Hata:", error);
                    submitBtn.innerText = "Hata!";
                });
        };
    }

    function removeModal(el) {
        el.remove();
    }

    // Sayfa yüklendiğinde başlat
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})(window, document);
