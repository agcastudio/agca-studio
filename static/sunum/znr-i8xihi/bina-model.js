// Revit/IFC modelinden bina kurucusu (model/model.js -> window.MODEL).
// Dünya düzeni: Y yukarı, yol (asfalt) yüzeyi y = 0, +Z yol tarafı. Model Y'si ±0.00'a göredir -> -yolKotu kaydırılır.
window.BINA_MODEL = function (ctx) {
  const { P, scene, mat, kutu, agac, TURUNCU } = ctx;
  const A = P.modelAyarlari || {};
  const yolKotu = A.yolKotu || 0;
  const haric = new Set(A.haricKatlar || []);
  const M = window.MODEL, V = M.veri;

  const RENK = {
    duvar: 0xf3f0ea, doseme: 0xdfe3e8, cati: 0xb7a89a, cam: 0x6f8aa0, dograma: 0x8c97a3,
    korkuluk: 0x4a5560, kapi: 0x8a6a4a, komsu: 0xe4ddd0, arazi: 0xd4dfcc, altbolum: 0xd2d5d8, kaldirim: 0xb8bdc2
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
          parcalar.push({ o, m, kategori, kat, golge });
        });

        // ---------- Yol (asfalt şerit + orta çizgi) ----------
        if (V.yol) {
          const en = V.yol.uzakZ - V.yol.yakinZ, zOrta = (V.yol.yakinZ + V.yol.uzakZ) / 2;
          const asfalt = new THREE.Mesh(new THREE.PlaneGeometry(200, en), mat(0x59616a));
          asfalt.rotation.x = -Math.PI / 2;
          asfalt.position.set(0, 0.15, zOrta);
          asfalt.receiveShadow = true;
          scene.add(asfalt);
          const serit = new THREE.MeshBasicMaterial({ color: 0xf3f3ef });
          for (let x = -98; x <= 98; x += 7) kutu(3.2, 0.02, 0.22, serit, x, 0.16, zOrta, false);
        }

        // ---------- Ağaçlar (Lombardy kavağı -> dik, ince taç) ----------
        (V.agaclar || []).forEach(([x, z]) => agac(x, z, 1.2, 2.6));

        // ---------- Daireler: her dahil kat bir bölüm (vurgu hacmi) ----------
        const daireler = [];
        V.katlar.filter(k => !haric.has(k.id)).forEach((k, i) => {
          const shape = new THREE.Shape(k.taban.map(([x, z]) => new THREE.Vector2(x, z)));
          const h = k.yukseklik - 0.35;
          const y0 = k.kot - yolKotu + 0.03;
          const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
          g.rotateX(Math.PI / 2);          // (x, Zplan, d) -> (x, -d, Zplan)
          g.translate(0, y0 + h, 0);        // hacim y0..y0+h aralığında
          const m = new THREE.MeshStandardMaterial({
            color: TURUNCU, emissive: TURUNCU, emissiveIntensity: 0.25, roughness: 0.6, transparent: true, opacity: 0.92
          });
          const mesh = new THREE.Mesh(g, m);
          mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), new THREE.LineBasicMaterial({ color: 0x9c3a08 })));
          mesh.visible = false;             // r128 Raycaster görünmez mesh'e de çarpar: kata tıklayınca seçilir
          const no = i + 1;
          mesh.userData.no = no;
          scene.add(mesh);
          g.computeBoundingBox();
          const bb = g.boundingBox, merkez = bb.getCenter(new THREE.Vector3());
          daireler.push({
            no, k: i, katAdi: k.ad, kod: "", cephe: "", alan: k.alan,
            dosemeY: k.kot - yolKotu, yukseklik: k.yukseklik,
            merkez, ust: new THREE.Vector3(merkez.x, bb.max.y + 0.5, merkez.z),
            onZ: k.onZ, hedefler: [mesh], malzeme: m,
            varsayilanAd: k.ad + " (tüm kat)", katId: k.id, taban: k.taban, dis: k.dis
          });
        });

        // ---------- Bina kutusu ----------
        const bmin = new THREE.Vector3(V.bina.min[0], V.bina.min[1] - yolKotu, V.bina.min[2]);
        const bmax = new THREE.Vector3(V.bina.max[0], V.bina.max[1] - yolKotu, V.bina.max[2]);
        const boyut = bmax.clone().sub(bmin);
        const bina = { min: bmin, max: bmax, merkez: bmin.clone().add(bmax).multiplyScalar(0.5) };

        function vurgula(secili) {
          daireler.forEach(d => { d.hedefler[0].visible = d === secili; });
          parcalar.forEach(p => {
            let op = 1;
            if (secili) {
              if (binaMi(p.kategori)) op = p.kat === secili.katId ? 0.35 : 0.1;
              else if (p.kategori === "komsu") op = 0.18;
            }
            p.m.opacity = op; p.m.transparent = op < 1; p.m.depthWrite = op === 1; p.m.needsUpdate = true;
            p.o.castShadow = op === 1 && p.golge;
          });
        }

        function plan(d) {
          return { poligonlar: [{ noktalar: d.taban, secili: true, etiket: "" }], gri: [d.dis] };
        }

        coz({
          daireler, bina,
          olcek: Math.max(boyut.x, boyut.y, boyut.z),
          yol: V.yol ? { yakinZ: V.yol.yakinZ, uzakZ: V.yol.uzakZ } : null,
          kesit: { katlar: daireler.map(d => ({ ad: d.katAdi, kot: d.dosemeY, yukseklik: d.yukseklik })), ust: bmax.y },
          vurgula, plan
        });
      } catch (e) { red(e); }
    }, err => red(err));
  });
};
