// Örnek (prosedürel) bina: veri.js'teki ölçülerden kutu daireler kurar. Revit/IFC modeli yoksa kullanılır.
window.BINA_PROSEDUREL = function (ctx) {
  const { P, scene, mat, kutu, agac, TURUNCU } = ctx;
  const B = P.bina, H = P.katYuksekligi, Z0 = P.zeminKotu, DOSEME = 0.3, BEYAZ = 0xf5f2ec;
  const onCepheZ = B.derinlik / 2;
  const kaldirimIc = onCepheZ + P.cevre.onBahce;
  const yolKenar = kaldirimIc + P.cevre.kaldirim;
  const yolBitis = yolKenar + P.cevre.yolGenisligi;
  const binaYuk = Z0 + P.katlar.length * H;

  // ---------- Çevre ----------
  const parselArka = -onCepheZ - 10;
  kutu(B.en + 18, 0.15, kaldirimIc - parselArka, mat(0xd6e0cf), 0, 0, (kaldirimIc + parselArka) / 2, false);
  const kaldirimMat = mat(0xcfd3d6);
  kutu(400, 0.15, P.cevre.kaldirim, kaldirimMat, 0, 0, (kaldirimIc + yolKenar) / 2, false);
  kutu(400, 0.15, 3, kaldirimMat, 0, 0, yolBitis + 1.5, false);
  const yol = new THREE.Mesh(new THREE.PlaneGeometry(400, P.cevre.yolGenisligi), mat(0x59616a));
  yol.rotation.x = -Math.PI / 2; yol.position.set(0, 0.01, (yolKenar + yolBitis) / 2);
  yol.receiveShadow = true; scene.add(yol);
  const serit = new THREE.MeshBasicMaterial({ color: 0xf3f3ef });
  for (let x = -198; x < 200; x += 7) kutu(3.2, 0.02, 0.22, serit, x, 0.01, (yolKenar + yolBitis) / 2, false);
  [-24, -34, 24, 34].forEach(x => agac(x, kaldirimIc + 1.4, 1));
  agac(-B.en / 2 - 5, parselArka + 4, 1.3); agac(B.en / 2 + 5, parselArka + 5, 1.1);
  agac(-B.en / 2 - 5, onCepheZ - 2, 0.9); agac(B.en / 2 + 5, onCepheZ - 3, 1.0);

  // ---------- Bina gövdesi ----------
  const diger = [];
  const subasmanMat = mat(0xcdd2d7, { transparent: true }); diger.push(subasmanMat);
  kutu(B.en, Z0 - 0.15, B.derinlik, subasmanMat, 0, 0.15, 0);
  const dosemeMat = mat(0xdde2e7, { transparent: true }); diger.push(dosemeMat);
  for (let k = 0; k <= P.katlar.length; k++) {
    kutu(B.en + 0.3, k === P.katlar.length ? 0.6 : DOSEME, B.derinlik + 0.3, dosemeMat, 0, Z0 + k * H - DOSEME, 0);
  }
  const cekMat = mat(0xc4cad1, { transparent: true }); diger.push(cekMat);
  (P.cekirdek || []).forEach(c => kutu(c.en - 0.12, binaYuk - Z0 - DOSEME, c.derinlik - 0.12, cekMat,
    c.x + c.en / 2 - B.en / 2, Z0, onCepheZ - c.z - c.derinlik / 2));

  function pencereler(mesh, t, w, h, d, camMat) {
    const yuzler = [];
    if (t.z <= 0.01) yuzler.push({ uz: w, pos: [0, 0, d / 2 + 0.03], ry: 0 });
    if (t.z + t.derinlik >= B.derinlik - 0.01) yuzler.push({ uz: w, pos: [0, 0, -d / 2 - 0.03], ry: Math.PI });
    if (t.x <= 0.01) yuzler.push({ uz: d, pos: [-w / 2 - 0.03, 0, 0], ry: -Math.PI / 2 });
    if (t.x + t.en >= B.en - 0.01) yuzler.push({ uz: d, pos: [w / 2 + 0.03, 0, 0], ry: Math.PI / 2 });
    yuzler.forEach(y => {
      const n = Math.max(1, Math.round(y.uz / 4));
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry((y.uz / n) * 0.55, h * 0.5), camMat);
        const kay = -y.uz / 2 + (i + 0.5) * (y.uz / n);
        p.rotation.y = y.ry; p.position.set(y.pos[0], 0.15, y.pos[2]);
        if (y.ry === 0 || y.ry === Math.PI) p.position.x = kay; else p.position.z = kay;
        mesh.add(p);
      }
    });
  }

  const daireler = [];
  P.katlar.forEach((katAdi, k) => {
    P.daireTipleri.forEach((t, i) => {
      const no = k * P.daireTipleri.length + i + 1;
      const w = t.en - 0.12, d = t.derinlik - 0.12, h = H - DOSEME;
      const cx = t.x + t.en / 2 - B.en / 2, cz = onCepheZ - t.z - t.derinlik / 2, yAlt = Z0 + k * H;
      const m = mat(BEYAZ, { roughness: 0.85 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(cx, yAlt + h / 2, cz); mesh.castShadow = mesh.receiveShadow = true;
      const kenarMat = new THREE.LineBasicMaterial({ color: 0x7d8996, transparent: true, opacity: 0.55 });
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), kenarMat));
      const camMat = mat(0x627789, { roughness: 0.35, metalness: 0.2 });
      pencereler(mesh, t, w, h, d, camMat);
      mesh.userData.no = no; scene.add(mesh);
      daireler.push({
        no, k, katAdi, kod: t.kod, cephe: t.cephe, alan: t.brut || null, dosemeY: yAlt, yukseklik: H,
        merkez: new THREE.Vector3(cx, yAlt + h / 2, cz), ust: new THREE.Vector3(cx, yAlt + h + 0.4, cz),
        onZ: cz + d / 2, hedefler: [mesh], malzeme: m, varsayilanAd: "Hak Sahibi " + no,
        tip: t, _mesh: mesh, _kenar: kenarMat, _cam: camMat
      });
    });
  });

  const katVurgu = new THREE.Mesh(new THREE.BoxGeometry(B.en + 1.4, 0.1, B.derinlik + 1.4),
    new THREE.MeshBasicMaterial({ color: TURUNCU, transparent: true, opacity: 0.45, depthWrite: false }));
  katVurgu.visible = false; scene.add(katVurgu);

  function vurgula(secili) {
    daireler.forEach(d => {
      let op = 1;
      if (secili && d !== secili) op = d.k === secili.k ? 0.3 : 0.1;
      const s = d === secili;
      d.malzeme.color.set(s ? TURUNCU : BEYAZ); d.malzeme.emissive.set(s ? TURUNCU : 0x000000);
      [d.malzeme, d._cam].forEach(m => { m.opacity = op; m.transparent = op < 1; m.depthWrite = op === 1; m.needsUpdate = true; });
      d._kenar.color.set(s ? 0x9c3a08 : 0x7d8996);
      d._kenar.opacity = secili ? (s ? 0.95 : 0.22) : 0.55;
      d._mesh.castShadow = op === 1;
    });
    diger.forEach(m => { m.opacity = secili ? 0.22 : 1; m.depthWrite = !secili; m.needsUpdate = true; });
    katVurgu.visible = !!secili;
    if (secili) katVurgu.position.set(0, secili.dosemeY + 0.03, 0);
  }

  const dikdortgen = r => {
    const x0 = r.x - B.en / 2, x1 = x0 + r.en, z0 = onCepheZ - r.z, z1 = z0 - r.derinlik;
    return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  };
  const min = new THREE.Vector3(-B.en / 2, 0, -B.derinlik / 2), max = new THREE.Vector3(B.en / 2, binaYuk, B.derinlik / 2);
  return {
    daireler,
    bina: { min, max, merkez: min.clone().add(max).multiplyScalar(0.5) },
    olcek: Math.max(B.en, B.derinlik, binaYuk),
    yol: { yakinZ: yolKenar, uzakZ: yolBitis },
    kesit: { katlar: P.katlar.map((ad, k) => ({ ad, kot: Z0 + k * H, yukseklik: H })), ust: binaYuk },
    vurgula,
    plan: d => ({
      poligonlar: P.daireTipleri.map(t => ({ noktalar: dikdortgen(t), secili: t === d.tip, etiket: t.kod })),
      gri: (P.cekirdek || []).map(dikdortgen)
    })
  };
};
