(function (window, document) {
    'use strict';

    // AYARLAR
    const CONFIG = {
        apiEndpoint: 'https://insightcatch.vercel.app/api/capture', // Kendi linkin
        threshold: 20,    // Mouse yukarı limiti
        minTime: 8000,    // 8 Saniye bekle (Hemen çıkana sorma)
        minScroll: 30     // %30 Scroll
    };

    let isReady = false;
    let hasTriggered = false;

    // 1. BAĞLAMA GÖRE SORU (Killer Feature)
    function getContext() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('pricing') || path.includes('fiyat')) return { title: "Fiyatlar aklına yatmadı mı? 🤔", opts: ["Bütçemi aşıyor", "Rakipler daha ucuz", "Özellikler yetersiz", "Sadece bakıyordum"] };
        if (path.includes('cart') || path.includes('checkout') || path.includes('sepet')) return { title: "Ödemede sorun mu var? 💳", opts: ["Kargo pahalı", "Güvenemedim", "Hata aldım", "Kupon çalışmadı"] };
        return { title: "Gitmeden küçük bir soru... 👋", opts: ["Aradığımı bulamadım", "Fiyat bakıyordum", "Sadece geziniyordum", "Diğer"] };
    }

    // 2. TETİKLEME MANTIĞI
    function init() {
        setTimeout(() => { isReady = true; }, CONFIG.minTime);
        document.addEventListener('scroll', () => {
            if (!isReady && ((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100 > CONFIG.minScroll)) isReady = true;
        });
        document.addEventListener('mouseleave', (e) => {
            if (isReady && !hasTriggered && e.clientY < CONFIG.threshold) showModal();
        });
    }

    // 3. MODAL GÖSTERİMİ
    function showModal() {
        hasTriggered = true;
        const ctx = getContext();
        const modal = document.createElement('div');
        modal.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);display:flex;justify-content:center;align-items:center;z-index:999999;">
            <div style="background:white;padding:25px;border-radius:12px;width:340px;box-shadow:0 20px 40px rgba(0,0,0,0.2);font-family:sans-serif;text-align:center;">
                <h3 style="margin:0 0 15px;color:#222;font-size:18px;">${ctx.title}</h3>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${ctx.opts.map(o => `<button class="ic-btn" style="padding:10px;border:1px solid #eee;background:#fff;border-radius:6px;cursor:pointer;transition:0.2s;">${o}</button>`).join('')}
                </div>
                <input id="ic-text" placeholder="Veya buraya yaz..." style="margin-top:10px;width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;display:none;">
                <button id="ic-close" style="background:none;border:none;color:#999;font-size:12px;margin-top:15px;cursor:pointer;">Kapat</button>
                <a href="https://insightcatch.vercel.app" target="_blank" style="display:block;margin-top:10px;font-size:10px;color:#ccc;text-decoration:none;">Powered by InsightCatch</a>
            </div>
        </div>`;
        document.body.appendChild(modal);

        // Eventler
        modal.querySelectorAll('.ic-btn').forEach(btn => {
            btn.onclick = () => sendData(btn.innerText, modal);
        });
        document.getElementById('ic-close').onclick = () => modal.remove();
    }

    function sendData(feedback, modal) {
        modal.innerHTML = '<div style="background:white;padding:20px;border-radius:10px;">Teşekkürler! 🚀</div>';
        setTimeout(() => modal.remove(), 1000);
        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback, url: window.location.href })
        });
    }

    if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})(window, document);
