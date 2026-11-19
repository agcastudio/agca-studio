// Revit/IFC modelinden bina kurucusu (model/model.js -> window.MODEL).
// Dünya düzeni: Y yukarı, yol (asfalt) yüzeyi y = 0, +Z yol tarafı. Model Y'si ±0.00'a göredir -> -yolKotu kaydırılır.
// Modelde oda (IfcSpace) varsa her bağımsız bölüm ayrı seçilir; yoksa her kat tek bölüm olur.
window.BINA_MODEL = function (ctx) {
  const { P, scene, mat, kutu, agac, TURUNCU } = ctx;
  const A = P.modelAyarlari || {};
  const haric = new Set(A.haricKatlar || []);
  const M = window.MODEL, V = M.veri;
  // Zemin (yol) kotu: veri.js'te verilmezse modelden (Toposolid alt bölgesi) okunur
  const yolKotu = A.yolKotu ?? V.zeminKotu ?? 0;
  const katListesi = V.katlar.filter(k => !haric.has(k.id));
  // Bodrumlar toprak altında kalmasın: bina, en alt katı zemine oturacak kadar yukarı taşınır; yol ve arazi yerinde kalır
  const kaldir = A.binayiKaldir === false ? 0 : Math.max(0, yolKotu - Math.min(...katListesi.map(k => k.kot)));

  const RENK = {
    duvar: 0xf3f0ea, doseme: 0xdfe3e8, cati: 0xb7a89a, cam: 0x6f8aa0, dograma: 0x8c97a3,
    korkuluk: 0x4a5560, kapi: 0x8a6a4a, komsu: 0xe4ddd0, arazi: 0xd4dfcc, kaldirim: 0xb8bdc2,
    altbolum: V.yol ? 0xd2d5d8 : 0x6b7178   // bordür yoksa alt bölge yolun kendisidir -> asfalt
  };
  const CEVRE = new Set(["arazi", "altbolum", "kaldirim"]);   // saydamlaşmayan zemin elemanları
  const binaMi = k => !CEVRE.has(k) && k !== "komsu";

  // GLTFLoader adları temizleyebilir; "kategori__katId" biçimini birkaç yerden ara
  function adCoz(o) {
    const adaylar = [o.name, o.userData && o.userData.name, o.geometry && o.geometry.name, o.parent && o.parent.name];
    for (const ad of adaylar) {
      if (ad && ad.indexOf("__") > 0) { const [kategori, kat] = ad.split("__"); return { kategori, kat }; }
    }
    return { kategori: "diger", kat: "-" };
  }

  return new Promise((coz, red) => {
    let bin;
    try { bin = Uint8Array.from(atob(M.glb), c => c.charCodeAt(0)).buffer; } catch (e) { red(e); return; }

    new THREE.GLTFLoader().parse(bin, "", gltf => {
      try {
        const kok = gltf.scene;
        kok.position.y = -yolKotu;
        scene.add(kok);

        // ---------- Model parçaları: her mesh kendi malzemesiyle ----------
        const parcalar = [];
        kok.traverse(o => {
          if (!o.isMesh) return;
          const { kategori, kat } = adCoz(o);
          o.geometry.computeVertexNormals();
          const ek = kategori === "cam" ? { roughness: 0.25, metalness: 0.3 } : {};
          ek.side = THREE.DoubleSide;
          const m = mat(RENK[kategori] !== undefined ? RENK[kategori] : 0xcccccc, ek);
          o.material = m;
          const golge = binaMi(kategori) || kategori === "komsu";
          o.castShadow = golge; o.receiveShadow = true;
          if (binaMi(kategori)) o.position.y += kaldir;
          parcalar.push({ o, m, kategori, kat, golge });
        });

        // Arazi/yol en üst kotu: bunun altında kalan bölüm seçilince arazi yarı saydam olur (yamaçta toprak arkasında kalmasın)
        kok.updateMatrixWorld(true);
        const cevreUst = parcalar.filter(p => CEVRE.has(p.kategori))
          .reduce((m, p) => Math.max(m, new THREE.Box3().setFromObject(p.o).max.y), -Infinity);

        // ---------- Yol (asfalt şerit + orta çizgi) ----------
        if (V.yol) {
          const en = V.yol.uzakZ - V.yol.yakinZ, zOrta = (V.yol.yakinZ + V.yol.uzakZ) / 2;
          const asfalt = new THREE.Mesh(new THREE.PlaneGeometry(200, en), mat(0x59616a));
          asfalt.rotation.x = -Math.PI / 2; asfalt.position.set(0, 0.15, zOrta); asfalt.receiveShadow = true;
          scene.add(asfalt);
          const serit = new THREE.MeshBasicMaterial({ color: 0xf3f3ef });
          for (let x = -98; x <= 98; x += 7) kutu(3.2, 0.02, 0.22, serit, x, 0.16, zOrta, false);
        }
        (V.agaclar || []).forEach(([x, z]) => agac(x, z, 1.2, 2.6));

        // ---------- Bölüm hacimleri ----------
        const katIndeks = id => katListesi.findIndex(k => k.id === id);
        const yeniMalzeme = renk => new THREE.MeshStandardMaterial({
          color: renk, emissive: renk, emissiveIntensity: 0.05, roughness: 0.8
        });
        // Sade palet: düşük doygunluklu, eşit açıklıkta 10 ton (tozlu kırmızı, kil, hardal, adaçayı, nane, petrol,
        // tozlu mavi, çivit, lavanta, gülkurusu). Sırayla 3'er adım atlanır: aynı kattaki ardışık numaralar
        // birbirinden uzak tonlar alır. veri.js'te renkPaleti ile palet, daireBilgileri[no].renk ile tek bölüm değişir.
        const PALET = P.renkPaleti || ["#c48b8b", "#c79a73", "#c2b26e", "#95b07f", "#7fae98",
                                       "#6fa7a7", "#7f9dbd", "#8e8fc2", "#a98bbd", "#bf8aa8"];
        const renkVer = (no, i) => {
          const ozel = ((P.daireBilgileri || {})[no] || {}).renk;
          return new THREE.Color(ozel || PALET[(i * 3) % PALET.length]);
        };
        function hacim(taban, kat, m, no, kenarRenk) {
          const shape = new THREE.Shape(taban.map(([x, z]) => new THREE.Vector2(x, z)));
          const h = kat.yukseklik - 0.35, y0 = kat.kot - yolKotu + kaldir + 0.03;
          const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
          g.rotateX(Math.PI / 2);          // (x, Zplan, d) -> (x, -d, Zplan)
          g.translate(0, y0 + h, 0);        // hacim y0..y0+h aralığında
          const kenarMat = new THREE.LineBasicMaterial({ color: kenarRenk, transparent: true });
          const mesh = new THREE.Mesh(g, m);
          mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), kenarMat));
          mesh.visible = false;             // r128 Raycaster görünmez mesh'e de çarpar: tıklayınca seçilir
          mesh.userData.no = no;
          scene.add(mesh);
          g.computeBoundingBox();
          return { mesh, kenarMat, kutu: g.boundingBox };
        }

        const bolumlu = !!(V.daireler && V.daireler.length);
        const kaynak = bolumlu
          ? V.daireler.map(b => ({ no: b.no, ad: b.ad, parcalar: b.parcalar.filter(p => katIndeks(p.katId) >= 0) }))
          : katListesi.map((k, i) => ({ no: i + 1, ad: k.ad, tumKat: true, alan: k.alan, parcalar: [{ katId: k.id, taban: k.taban }] }));

        const daireler = [];
        kaynak.filter(b => b.parcalar.length).forEach((b, i) => {
          const renk = renkVer(b.no, i), koyu = renk.clone().offsetHSL(0, 0, -0.25);
          const m = yeniMalzeme(renk), hedefler = [], kenarlar = [], kutuB = new THREE.Box3();
          b.parcalar.forEach(p => {
            const kat = katListesi[katIndeks(p.katId)];
            p.dosemeY = kat.kot - yolKotu + kaldir; p.yukseklik = kat.yukseklik;   // her parçanın (dubleks katı) kendi cephe etiketi için
            const h = hacim(p.taban, kat, m, b.no, koyu);
            hedefler.push(h.mesh); kenarlar.push(h.kenarMat); kutuB.union(h.kutu);
          });
          const kler = [...new Set(b.parcalar.map(p => katIndeks(p.katId)))].sort((x, y) => x - y);
          const alt = katListesi[kler[0]], merkez = kutuB.getCenter(new THREE.Vector3());
          daireler.push({
            no: b.no, k: kler[0], kler, tumKat: !!b.tumKat,
            katAdi: kler.map(i => katListesi[i].ad).join(" + ") + (kler.length > 1 ? " (dubleks)" : ""),
            kod: "", cephe: "", alan: b.alan || null,
            dosemeY: alt.kot - yolKotu + kaldir, yukseklik: alt.yukseklik,
            merkez, ust: new THREE.Vector3(merkez.x, kutuB.max.y + 0.5, merkez.z), onZ: kutuB.max.z,
            hedefler, malzeme: m, kenarlar, parcalar: b.parcalar,
            renk: "#" + renk.getHexString(), renkKoyu: "#" + koyu.getHexString(),
            varsayilanAd: b.tumKat ? b.ad + " (tüm kat)" : b.ad,
            katId: alt.id, katIdleri: kler.map(i => katListesi[i].id)
          });
        });

        // ---------- Bina kutusu ----------
        const bmin = new THREE.Vector3(V.bina.min[0], V.bina.min[1] - yolKotu + kaldir, V.bina.min[2]);
        const bmax = new THREE.Vector3(V.bina.max[0], V.bina.max[1] - yolKotu + kaldir, V.bina.max[2]);
        const boyut = bmax.clone().sub(bmin);
        const bina = { min: bmin, max: bmax, merkez: bmin.clone().add(bmax).multiplyScalar(0.5) };

        // Genel görünüm: tüm bölümler kendi renginde, bina kabuğu saydam.
        // Seçimde: seçili bölüm tam renk, aynı kattakiler yarı saydam, diğer katlar çok soluk.
        function vurgula(secili) {
          const katlar = new Set(secili ? secili.katIdleri : []);
          daireler.forEach(d => {
            const s = d === secili, ayniKat = !s && d.katIdleri.some(k => katlar.has(k));
            const op = !secili || s ? 1 : ayniKat ? 0.35 : 0.08;
            d.hedefler.forEach(h => { h.visible = true; h.castShadow = op === 1; });
            const m = d.malzeme;
            m.opacity = op; m.transparent = op < 1; m.depthWrite = op === 1; m.emissiveIntensity = s ? 0.15 : 0.05; m.needsUpdate = true;
            d.kenarlar.forEach(k => { k.opacity = !secili ? 0.6 : s ? 1 : 0.2; });
          });
          parcalar.forEach(p => {
            let op = 1;
            if (binaMi(p.kategori)) op = !secili ? (bolumlu ? 0.2 : 1) : katlar.has(p.kat) ? 0.25 : 0.08;
            else if (p.kategori === "komsu" && secili) op = 0.18;
            else if (CEVRE.has(p.kategori) && secili && secili.dosemeY < cevreUst - 0.5) op = 0.45;
            p.m.opacity = op; p.m.transparent = op < 1; p.m.depthWrite = op === 1; p.m.needsUpdate = true;
            p.o.castShadow = op === 1 && p.golge;
          });
        }

        // Mini plan: seçili bölümün (alt) katındaki tüm bölümler, seçili olan turuncu
        function plan(d) {
          const poligonlar = [];
          daireler.forEach(x => x.parcalar.filter(p => p.katId === d.katId).forEach(p =>
            poligonlar.push({ noktalar: p.taban, secili: x === d, etiket: bolumlu ? String(x.no) : "", renk: x.renk })));
          const kat = katListesi[d.k];
          return { poligonlar, gri: kat && kat.dis ? [kat.dis] : [] };
        }

        coz({
          daireler, bina,
          olcek: Math.max(boyut.x, boyut.y, boyut.z),
          yonlu: parcalar.some(p => p.kategori === "komsu"),   // bitişik nizam: kamera önde kalsın
          yol: V.yol ? { yakinZ: V.yol.yakinZ, uzakZ: V.yol.uzakZ } : null,
          // Kesit gerçek kotları gösterir (bodrumlar zemin çizgisinin altında); 3B'deki kaldırma yalnız görünüm içindir
          kesit: { katlar: katListesi.map(k => ({ ad: k.ad, kot: k.kot - yolKotu, yukseklik: k.yukseklik })), ust: bmax.y - kaldir },
          vurgula, plan
        });
      } catch (e) { red(e); }
    }, err => red(err));
  });
};
