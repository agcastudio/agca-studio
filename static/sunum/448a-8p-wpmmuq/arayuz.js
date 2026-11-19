// Arayüz: daire/kat listesi, bilgi kartı, mini plan/kesit, etiketler, sunum modu, kumanda tuşları.
(function () {
  const S = window.SAHNE, P = S.P;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sayi = (v, b) => v.toLocaleString("tr-TR", { minimumFractionDigits: b, maximumFractionDigits: b });
  const f2 = v => (v >= 0 ? "+" : "") + sayi(v, 2) + " m";
  const malikVar = d => !!(P.malikler && P.malikler[d.no]);
  const malikAdi = d => malikVar(d) ? P.malikler[d.no] : d.varsayilanAd;
  const etiketMetni = d => d.kod ? `Daire ${d.no} · ${malikAdi(d)}` : (malikVar(d) ? `${d.katAdi} · ${P.malikler[d.no]}` : d.katAdi);
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, at, ebeveyn, metin) {
    const e = document.createElementNS(NS, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    if (metin) e.textContent = metin;
    ebeveyn.appendChild(e); return e;
  }

  S.hazir.then(() => {
    const K = S.kesit.katlar;
    $("projeAdi").textContent = P.ad;
    $("projeAlt").textContent = P.blok + " · " + K.length + " kat" +
      (S.daireler.length !== K.length ? " · " + S.daireler.length + " daire" : "") + (S.modelVar ? " · Revit modeli" : "");

    // ---------- Liste ----------
    let gorunen = S.daireler.slice(), aktifNo = null;
    function listeCiz() {
      const q = $("ara").value.trim().toLocaleLowerCase("tr");
      gorunen = S.daireler.filter(d => !q || String(d.no) === q ||
        malikAdi(d).toLocaleLowerCase("tr").includes(q) || d.katAdi.toLocaleLowerCase("tr").includes(q));
      const ic = $("listeIc"); ic.innerHTML = "";
      for (let k = K.length - 1; k >= 0; k--) {
        const katD = gorunen.filter(d => d.k === k); if (!katD.length) continue;
        const bas = document.createElement("div"); bas.className = "kat-baslik";
        bas.textContent = K[k].ad + " · yoldan " + f2(K[k].kot);
        ic.appendChild(bas);
        katD.forEach(d => {
          const alt = [d.kod && d.kod + " tipi", d.cephe, d.alan && sayi(d.alan, 0) + " m²"].filter(Boolean).join(" · ");
          const b = document.createElement("button"); b.className = "daire-btn"; b.dataset.no = d.no;
          b.innerHTML = `<b>${d.no}</b><span>${esc(malikAdi(d))}<small>${esc(alt || d.katAdi)}</small></span>`;
          b.onclick = () => goster(d.no);
          ic.appendChild(b);
        });
      }
      isaretle(false);
    }
    function isaretle(kaydir) {
      document.querySelectorAll(".daire-btn").forEach(b => {
        const s = Number(b.dataset.no) === aktifNo; b.classList.toggle("secili", s);
        if (s && kaydir) b.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
    $("ara").addEventListener("input", listeCiz);

    // ---------- Bilgi kartı ----------
    function goster(no) {
      aktifNo = no; S.sec(no); S.otomatik = true;
      const d = S.secili();
      $("kUst").textContent = P.blok + " · " + (d.kod ? "Daire " + d.no : d.katAdi);
      $("kAd").textContent = malikAdi(d);
      $("kAlt").textContent = d.katAdi + (d.kod ? " · " + d.kod + " tipi daire" : "");
      $("kYuk").textContent = f2(d.dosemeY);
      $("kGoz").textContent = "Göz hizası: " + f2(d.dosemeY + (P.gozHizasi || 1.6));
      $("kKat").textContent = d.katAdi;
      $("kCephe").textContent = d.cephe || "—";
      $("kAlan").textContent = d.alan ? sayi(d.alan, 0) + " m²" : "—";
      $("kAlti").textContent = d.k === 0 ? "Yok (en alt kat)" : d.k + " kat";
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
        el("polygon", { points: pts(p.noktalar), fill: p.secili ? "#f0641e" : "#fff",
          stroke: p.secili ? "#9c3a08" : "#9aa5b1", "stroke-width": o * 0.01 }, s);
        if (p.etiket) {
          const cx = p.noktalar.reduce((a, q) => a + q[0], 0) / p.noktalar.length;
          const cz = p.noktalar.reduce((a, q) => a + q[1], 0) / p.noktalar.length;
          el("text", { x: cx, y: cz + o * 0.04, "text-anchor": "middle", "font-size": o * 0.12, "font-weight": 700,
            fill: p.secili ? "#fff" : "#5d6977" }, s, p.etiket);
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
        fill: i === d.k ? o : "#fff", stroke: "#9aa5b1", "stroke-width": 0.15 }, s));
      const son = K[K.length - 1], tepe = son.kot + son.yukseklik;
      if (S.kesit.ust > tepe + 0.3) el("polygon", { points: `20,${Y(tepe)} 38,${Y(tepe)} 29,${Y(S.kesit.ust)}`, fill: "#d9dde2" }, s);
      el("line", { x1: 16, y1: Y(0), x2: 16, y2: Y(d.dosemeY), stroke: o, "stroke-width": 0.5 }, s);
      el("line", { x1: 14.5, y1: Y(0) - 0.1, x2: 17.5, y2: Y(0) - 0.1, stroke: o, "stroke-width": 0.5 }, s);
      el("line", { x1: 14.5, y1: Y(d.dosemeY), x2: 20, y2: Y(d.dosemeY), stroke: o, "stroke-width": 0.35, "stroke-dasharray": "0.8 0.5" }, s);
      el("text", { x: 14.5, y: Y(d.dosemeY / 2) + 0.9, "text-anchor": "end", "font-size": 2.5, "font-weight": 700, fill: o }, s,
        f2(d.dosemeY).replace(" m", ""));
    }

    // ---------- 3B etiketler ----------
    const et = {};
    [["daire", "vurgu"], ["olcu", "olcu"], ["yol", "yol"]].forEach(([n, c]) => {
      const e = document.createElement("div"); e.className = "etiket " + c; e.style.opacity = 0;
      $("etiketler").appendChild(e); et[n] = e;
    });
    et.yol.textContent = "YOL ±0,00";
    S.kareler.push(() => {
      const n = S.noktalar(), d = S.secili();
      for (const k in et) {
        if (!n) { et[k].style.opacity = 0; continue; }
        const p = S.ekran(n[k]);
        et[k].style.opacity = p.gorunur ? 1 : 0;
        et[k].style.left = p.x + "px"; et[k].style.top = p.y + "px";
      }
      if (n && d) {
        const v = S.olcuDegeri();
        et.olcu.textContent = "Yoldan " + f2(Math.abs(v - d.dosemeY) < 0.01 ? d.dosemeY : v);
        et.daire.textContent = etiketMetni(d);
      }
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
