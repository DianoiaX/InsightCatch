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
        apiUrl: 'http://localhost:3000/api/capture' // Next.js API adresi
    };

    let hasTriggered = false; // Kullanıcıyı spamlamamak için bayrak

    // Başlatıcı
    function init() {
        if (CONFIG.debug) console.log("🕵️ InsightCatch Ajanı göreve hazır.");

        // Masaüstü için çıkış niyeti (Mouse yukarı kaçarsa)
        document.addEventListener('mouseleave', handleExitIntent);

        // Mobil için (Şimdilik basit bir scroll mantığı - V2'de geliştireceğiz)
        // document.addEventListener('scroll', handleScrollIntent);
    }

    // Olay Yakalayıcı
    function handleExitIntent(e) {
        if (hasTriggered) return;

        // Eğer mouse tarayıcı penceresinin üst kısmına (adres çubuğuna) giderse
        if (e.clientY < CONFIG.threshold) {
            triggerAction();
        }
    }

    // Aksiyon (Modal Göster / Veri Gönder)
    function triggerAction() {
        hasTriggered = true;
        if (CONFIG.debug) console.log("🚀 Exit Intent Tespit Edildi! Aksiyon alınıyor...");

        // 1. Basit bir HTML Modal Enjekte Et (Shadow DOM kullanmıyoruz şimdilik)
        const modal = document.createElement('div');
        modal.id = 'insight-catch-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
            z-index: 999999; font-family: sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <h2 style="margin-top: 0; color: #333;">Gitmeden önce küçük bir soru... 👋</h2>
                <p style="color: #666; margin-bottom: 20px;">Tam olarak aradığını bulamadın mı?</p>
                
                <textarea id="ic-feedback" placeholder="Buraya yazabilirsin..." style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px;"></textarea>
                
                <button id="ic-submit" style="background: #2563EB; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">Gönder</button>
                <button id="ic-close" style="background: transparent; border: none; color: #999; margin-left: 10px; cursor: pointer;">Kapat</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Event Listeners (Butonlar için)
        document.getElementById('ic-close').onclick = () => removeModal(modal);
        document.getElementById('ic-submit').onclick = () => {
            const feedback = document.getElementById('ic-feedback').value;
            const submitBtn = document.getElementById('ic-submit');

            // Butonu 'Gönderiliyor...' yap
            submitBtn.innerText = "Gönderiliyor...";
            submitBtn.disabled = true;

            // API'ye İstek At
            fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feedback: feedback,
                    url: window.location.href, // Hangi sayfadan geldi?
                    timestamp: new Date().toISOString()
                })
            })
                .then(response => response.json())
                .then(data => {
                    console.log("✅ Sunucu Cevabı:", data);
                    alert("Geri bildiriminiz alındı!");
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
