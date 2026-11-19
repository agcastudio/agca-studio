// Arayüz: daire/kat listesi, bilgi kartı, mini plan/kesit, etiketler, sunum modu, kumanda tuşları.
(function () {
  const S = window.SAHNE, P = S.P;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sayi = (v, b) => v.toLocaleString("tr-TR", { minimumFractionDigits: b, maximumFractionDigits: b });
  const f2 = v => (v >= 0 ? "+" : "") + sayi(v, 2) + " m";
  // Bölüm bilgisi: Excel'den gelen (model/bilgiler.js -> window.BILGILER) veri.js'tekinin üstüne yazılır
  const kayit = d => Object.assign({}, (P.daireBilgileri || {})[d.no], (window.BILGILER || {})[d.no]);
  const malikOf = d => kayit(d).malik || (P.malikler && P.malikler[d.no]) || null;
  const malikVar = d => !!malikOf(d);
  const malikAdi = d => malikOf(d) || d.varsayilanAd;
  // [başlık, alt başlık]: örnek bina "Hak Sahibi", Revit odaları "Bağımsız Bölüm No:N", odasız model kat adı
  function basliklar(d) {
    if (d.kod) return [malikAdi(d), d.katAdi + " · " + d.kod + " tipi daire"];
    return [d.tumKat ? d.katAdi : d.varsayilanAd, ""];   // malik kartta ayrı satırda
  }
  const etiketMetni = d => d.kod ? `Daire ${d.no} · ${malikAdi(d)}` : basliklar(d)[0];
  const alanBilgisi = d => {
    const b = kayit(d);
    return { eski: b.eskiAlan ?? null, brut: b.yeniBrut ?? b.brut ?? d.alan ?? null, net: b.yeniNet ?? b.net ?? null };
  };
  const m2 = v => v == null ? "—" : v.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " m²";
  // Bölüm rengi üstünde okunur yazı rengi (açık zeminde koyu, koyu zeminde beyaz)
  const yaziRengi = h => {
    if (!h) return "";
    const n = parseInt(h.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? "#18222d" : "#fff";
  };
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, at, ebeveyn, metin) {
    const e = document.createElementNS(NS, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    if (metin) e.textContent = metin;
    ebeveyn.appendChild(e); return e;
  }

  S.hazir.then(() => {
    const K = S.kesit.katlar;
    const h1 = $("projeAdi"); h1.textContent = "";
    if (P.logo) { const im = new Image(); im.src = P.logo; im.alt = P.ad; h1.appendChild(im); } else h1.textContent = P.ad;
    $("projeAlt").textContent = P.blok + " · " + K.length + " kat" +
      (S.daireler.length !== K.length ? " · " + S.daireler.length + " daire" : "");

    // ---------- Liste ----------
    let gorunen = S.daireler.slice(), aktifNo = null;
    function listeCiz() {
      const q = $("ara").value.trim().toLocaleLowerCase("tr");
      gorunen = S.daireler.filter(d => !q || String(d.no) === q ||
        malikAdi(d).toLocaleLowerCase("tr").includes(q) || d.varsayilanAd.toLocaleLowerCase("tr").includes(q) ||
        d.katAdi.toLocaleLowerCase("tr").includes(q));
      const ic = $("listeIc"); ic.innerHTML = "";
      for (let k = K.length - 1; k >= 0; k--) {
        const katD = gorunen.filter(d => d.k === k); if (!katD.length) continue;
        const bas = document.createElement("div"); bas.className = "kat-baslik";
        bas.textContent = K[k].ad;
        ic.appendChild(bas);
        katD.forEach(d => {
          const a = alanBilgisi(d), [bas1, bas2] = basliklar(d);
          const alt = [!d.kod && bas2, d.kod && d.kod + " tipi", d.cephe, !d.kod && malikOf(d),
            a.net != null && "Yeni net " + m2(a.net)].filter(Boolean).join(" · ");
          const b = document.createElement("button"); b.className = "daire-btn"; b.dataset.no = d.no; b.dataset.renk = d.renk || "";
          const rozet = d.renk ? ` style="background:${d.renk};color:${yaziRengi(d.renk)}"` : "";
          b.innerHTML = `<b${rozet}>${d.no}</b><span>${esc(bas1)}<small>${esc(alt || d.katAdi)}</small></span>`;
          b.onclick = () => goster(d.no);
          ic.appendChild(b);
        });
      }
      isaretle(false);
    }
    function isaretle(kaydir) {
      document.querySelectorAll(".daire-btn").forEach(b => {
        const s = Number(b.dataset.no) === aktifNo; b.classList.toggle("secili", s);
        b.style.boxShadow = s && b.dataset.renk ? "inset 4px 0 0 " + b.dataset.renk : "";
        if (s && kaydir) b.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
    $("ara").addEventListener("input", listeCiz);

    // ---------- Bilgi kartı ----------
    function goster(no) {
      aktifNo = no; S.sec(no); S.otomatik = true;
      const d = S.secili();
      $("kUst").textContent = P.blok + " · " + (d.kod ? "Daire " + d.no : d.katAdi);
      const [bas1, bas2] = basliklar(d), a = alanBilgisi(d);
      $("kAd").textContent = bas1;
      $("kAlt").textContent = bas2; $("kAlt").style.display = bas2 ? "" : "none";
      $("kKat").textContent = d.katAdi;
      $("kCephe").textContent = d.cephe || "";
      $("kCepheKutu").style.display = d.cephe ? "" : "none";
      $("kMalik").textContent = malikOf(d) || "—";
      $("kEski").textContent = m2(a.eski);
      $("kBrut").textContent = m2(a.brut);
      $("kNet").textContent = m2(a.net);
      $("kRenk").style.background = d.renk || "";
      $("kUst").style.color = d.renkKoyu || "";
      $("kart").classList.remove("gizli");
      planCiz(d); kesitCiz(d); isaretle(true);
      zamanlayiciKur();
    }
    function genelGoster() {
      aktifNo = null; S.genel(); S.otomatik = true;
      $("kart").classList.add("gizli"); isaretle(false);
    }

    function planCiz(d) {
      const s = $("svgPlan"); s.innerHTML = "";
      const v = S.plan(d), hepsi = v.poligonlar.map(p => p.noktalar).concat(v.gri).flat();
      const xs = hepsi.map(p => p[0]), zs = hepsi.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      const o = Math.max(x1 - x0, z1 - z0), pay = o * 0.05, yolH = o * 0.12, yolY = z1 + pay * 1.5;
      s.setAttribute("viewBox", `${x0 - pay} ${z0 - pay} ${x1 - x0 + 2 * pay} ${yolY + yolH - z0 + 2 * pay}`);
      const pts = n => n.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ");
      v.gri.forEach(n => el("polygon", { points: pts(n), fill: "#c9cfd6" }, s));
      v.poligonlar.forEach(p => {
        el("polygon", { points: pts(p.noktalar), fill: p.renk || (p.secili ? "#f0641e" : "#fff"),
          "fill-opacity": p.renk && !p.secili ? 0.4 : 1,
          stroke: p.secili ? "#18222d" : "#9aa5b1", "stroke-width": o * (p.secili ? 0.016 : 0.01) }, s);
        if (p.etiket) {
          const cx = p.noktalar.reduce((a, q) => a + q[0], 0) / p.noktalar.length;
          const cz = p.noktalar.reduce((a, q) => a + q[1], 0) / p.noktalar.length;
          el("text", { x: cx, y: cz + o * 0.04, "text-anchor": "middle", "font-size": o * 0.12, "font-weight": 700,
            fill: p.secili ? (p.renk ? yaziRengi(p.renk) : "#fff") : "#18222d" }, s, p.etiket);
        }
      });
      el("rect", { x: x0 - pay, y: yolY, width: x1 - x0 + 2 * pay, height: yolH, fill: "#59616a" }, s);
      el("text", { x: (x0 + x1) / 2, y: yolY + yolH * 0.75, "text-anchor": "middle", "font-size": yolH * 0.7, fill: "#fff" }, s, "YOL");
    }
    function kesitCiz(d) {
      const s = $("svgKesit"); s.innerHTML = "";
      const ust = S.kesit.ust + 1.5, alt = Math.min(0, K[0].kot), Y = y => ust - y, o = "#f0641e";
      s.setAttribute("viewBox", `0 -1 40 ${ust - alt + 3}`);
      el("rect", { x: 0, y: Y(0), width: 40, height: 1.2, fill: "#59616a" }, s);
      if (K[0].kot > 0.05) el("rect", { x: 20, y: Y(K[0].kot), width: 18, height: K[0].kot, fill: "#cdd2d7" }, s);
      K.forEach((k, i) => el("rect", { x: 20, y: Y(k.kot + k.yukseklik), width: 18, height: k.yukseklik,
        fill: (d.kler || [d.k]).includes(i) ? (d.renk || o) : "#fff", stroke: "#9aa5b1", "stroke-width": 0.15 }, s));
      const son = K[K.length - 1], tepe = son.kot + son.yukseklik;
      if (S.kesit.ust > tepe + 0.3) el("polygon", { points: `20,${Y(tepe)} 38,${Y(tepe)} 29,${Y(S.kesit.ust)}`, fill: "#d9dde2" }, s);
    }

    // ---------- 3B etiketler ----------
    const et = document.createElement("div"); et.className = "etiket vurgu"; et.style.opacity = 0;
    $("etiketler").appendChild(et);
    S.kareler.push(() => {
      const n = S.noktalar(), d = S.secili();
      if (!n || !d) { et.style.opacity = 0; return; }
      const p = S.ekran(n.daire);
      et.style.opacity = p.gorunur ? 1 : 0;
      et.style.left = p.x + "px"; et.style.top = p.y + "px";
      et.textContent = etiketMetni(d);
      et.style.setProperty("--ok", d.renk || "#f0641e"); et.style.color = d.renk ? yaziRengi(d.renk) : "";
    });

    // ---------- Gezinme / sunum modu ----------
    function adim(yon) {
      const liste = gorunen.length ? gorunen : S.daireler;
      let i = liste.findIndex(d => d.no === aktifNo);
      i = i < 0 ? (yon > 0 ? 0 : liste.length - 1) : (i + yon + liste.length) % liste.length;
      goster(liste[i].no);
    }
    let sunumAcik = false, zmn = null;
    const SURE = 10000; // her dairede bekleme (ms)
    function zamanlayiciKur() { clearTimeout(zmn); if (sunumAcik) zmn = setTimeout(() => adim(1), SURE); }
    function sunum(ac) {
      sunumAcik = ac;
      $("bSunum").classList.toggle("aktif", ac);
      $("bSunum").textContent = ac ? "❚❚ Sunumu durdur" : "▶ Sunum modu";
      if (ac) { S.otomatik = true; if (aktifNo == null) adim(1); else zamanlayiciKur(); }
      else clearTimeout(zmn);
    }
    function temiz() {
      const t = document.body.classList.toggle("temiz");
      $("bTemiz").textContent = t ? "Paneli göster" : "Paneli gizle";
    }

    S.onTikla = no => goster(no);
    S.onMudahale = () => { S.otomatik = false; if (sunumAcik) sunum(false); };
    $("bOnceki").onclick = () => adim(-1);
    $("bSonraki").onclick = () => adim(1);
    $("bSunum").onclick = () => sunum(!sunumAcik);
    $("bGenel").onclick = () => { sunum(false); genelGoster(); };
    $("bTemiz").onclick = temiz;

    // Sunum kumandaları genelde PageDown/PageUp veya ok tuşu gönderir.
    addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT") { if (e.key === "Escape") e.target.blur(); return; }
      const k = e.key;
      if (["ArrowRight", "PageDown", " ", "ArrowDown"].includes(k)) { e.preventDefault(); adim(1); }
      else if (["ArrowLeft", "PageUp", "ArrowUp"].includes(k)) { e.preventDefault(); adim(-1); }
      else if (k === "Escape") { sunum(false); genelGoster(); }
      else if (k === "p" || k === "P") sunum(!sunumAcik);
      else if (k === "h" || k === "H") temiz();
    });

    listeCiz();
    S.otomatik = true;
  });
})();
