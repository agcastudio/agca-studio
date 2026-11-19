// Çekirdek sahne: renderer, kamera, ölçü çizgisi, seçim, döngü.
// Binayı bina-model.js (Revit/IFC -> model/model.js varsa) ya da bina-prosedurel.js (veri.js) kurar.
// Dünya: Y yukarı, y = 0 yol (asfalt) seviyesi, +Z yol tarafı.
(function () {
  const P = window.PROJE, TURUNCU = 0xf0641e;

  const canvas = document.getElementById("sahne");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const gc = document.createElement("canvas"); gc.width = 2; gc.height = 256;
  const gx = gc.getContext("2d"), gr = gx.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#b7cbdf"); gr.addColorStop(0.6, "#e2e9ef"); gr.addColorStop(1, "#edf1f4");
  gx.fillStyle = gr; gx.fillRect(0, 0, 2, 256);
  scene.background = new THREE.CanvasTexture(gc);
  scene.fog = new THREE.Fog(0xe6ebf0, 160, 420);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 1500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7c0ae, 0.8));
  const gunes = new THREE.DirectionalLight(0xffffff, 0.7);
  gunes.position.set(45, 75, 60); gunes.castShadow = true;
  gunes.shadow.mapSize.set(2048, 2048); gunes.shadow.bias = -0.0005;
  scene.add(gunes);

  const mat = (renk, ek) => new THREE.MeshStandardMaterial(Object.assign({ color: renk, roughness: 0.9 }, ek || {}));
  function kutu(w, h, d, m, x, yAlt, z, golge) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    k.position.set(x, yAlt + h / 2, z); k.receiveShadow = true; k.castShadow = golge !== false;
    scene.add(k); return k;
  }
  const govdeMat = mat(0x8a7a66), tacMat = mat(0xa3b89c, { flatShading: true });
  function agac(x, z, s, dikey) {
    s = s || 1; dikey = dikey || 1;
    kutu(0.35 * s, 2.2 * s, 0.35 * s, govdeMat, x, 0.15, z);
    const tac = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 * s, 0), tacMat);
    tac.scale.y = dikey; tac.position.set(x, 0.15 + 2.2 * s + 1.8 * s * dikey * 0.65, z);
    tac.castShadow = true; scene.add(tac);
  }
  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(0xe1e5de));
  zemin.rotation.x = -Math.PI / 2; zemin.position.y = -0.02; zemin.receiveShadow = true; scene.add(zemin);

  const modelVar = !!(window.MODEL && window.BINA_MODEL && THREE.GLTFLoader);
  if (window.MODEL && !modelVar) console.warn("Model var ama yükleyici eksik; örnek bina gösteriliyor.");
  const ctx = { P, scene, mat, kutu, agac, TURUNCU };

  // ---------- Ölçü çizgisi (yoldan döşemeye) ----------
  const olcu = new THREE.Group(); olcu.visible = false; scene.add(olcu);
  const olcuMat = new THREE.MeshBasicMaterial({ color: TURUNCU });
  const cubuk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16), olcuMat);
  const altCizgi = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), olcuMat);
  const ustCizgi = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), olcuMat);
  altCizgi.position.y = 0.2; olcu.add(cubuk, altCizgi, ustCizgi);
  const kilavuzGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const kilavuz = new THREE.Line(kilavuzGeo, new THREE.LineDashedMaterial({ color: TURUNCU, dashSize: 0.6, gapSize: 0.4 }));
  olcu.add(kilavuz);
  let olcuSimdi = 0, olcuHedef = 0, kilavuzUzunluk = 1;

  // ---------- Kamera ----------
  const kam = { hedef: new THREE.Vector3(0, 10, 4), r: 95, teta: 0.7, fi: 1.18 };
  const ist = { hedef: kam.hedef.clone(), r: kam.r, teta: kam.teta, fi: kam.fi };
  let R = null, secili = null, tabanTeta = 0, zaman = 0;
  const S = { P, modelVar, otomatik: false, onTikla: null, onMudahale: null, kareler: [], daireler: [] };

  function genel() {
    if (!R) return;
    secili = null; R.vurgula(null); olcu.visible = false;
    const c = R.bina.merkez;
    ist.hedef.set(c.x, R.bina.max.y * 0.42, c.z + 4);
    ist.r = R.olcek * 3.2; ist.fi = 1.16;
  }
  function sec(no) {
    const d = R && R.daireler.find(x => x.no === no); if (!d) return genel();
    secili = d; R.vurgula(d); olcu.visible = true;
    const c = R.bina.merkez;
    const sx = Math.sign(Math.round(d.merkez.x - c.x)), on = d.merkez.z >= c.z - 0.01;
    tabanTeta = on ? (sx === 0 ? 0.45 : sx * 0.55) : (sx === 0 ? Math.PI - 0.45 : sx * (Math.PI / 2 + 0.35));
    if (modelVar) tabanTeta = 0.25; // bitişik nizam: kamera ön (yol) cephesinde kalsın
    ist.teta = tabanTeta; ist.fi = 1.22;
    const yZ = R.yol ? R.yol.yakinZ : d.onZ + 8;
    ist.hedef.set(d.merkez.x * 0.5, Math.max(d.dosemeY * 0.55, 0) + 3, (d.onZ + yZ) * 0.3);
    ist.r = R.olcek * 1.8 + d.dosemeY * 0.6;
    olcu.position.set(d.merkez.x, 0, yZ + 0.8);
    olcuSimdi = 0; olcuHedef = d.dosemeY; kilavuzUzunluk = olcu.position.z - d.onZ;
  }

  // ---------- Fare / dokunma ----------
  let surukle = null;
  const mudahale = () => { if (S.onMudahale) S.onMudahale(); };
  canvas.addEventListener("pointerdown", e => { surukle = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => {
    if (!surukle) return;
    const dx = e.clientX - surukle.x, dy = e.clientY - surukle.y;
    surukle.x = e.clientX; surukle.y = e.clientY;
    if (Math.abs(e.clientX - surukle.sx) + Math.abs(e.clientY - surukle.sy) > 4) {
      ist.teta -= dx * 0.006; ist.fi = THREE.MathUtils.clamp(ist.fi - dy * 0.005, 0.3, 1.45);
      tabanTeta = ist.teta; mudahale();
    }
  });
  canvas.addEventListener("pointerup", e => {
    const hareket = surukle ? Math.abs(e.clientX - surukle.sx) + Math.abs(e.clientY - surukle.sy) : 99;
    surukle = null;
    if (hareket > 4 || !R) return;
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
    const hedefler = [].concat(...R.daireler.map(d => d.hedefler));
    const vur = ray.intersectObjects(hedefler, false)[0];
    if (vur && S.onTikla) S.onTikla(vur.object.userData.no);
  });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    ist.r = THREE.MathUtils.clamp(ist.r * (1 + e.deltaY * 0.001), 15, 320); mudahale();
  }, { passive: false });

  function boyut() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener("resize", boyut); boyut();

  // ---------- Döngü ----------
  const fark = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
  let onceki = performance.now();
  function kare(simdi) {
    const dt = Math.min(0.05, (simdi - onceki) / 1000); onceki = simdi; zaman += dt;
    if (S.otomatik) {
      if (secili) ist.teta = tabanTeta + (modelVar ? 0.3 : 0.45) * Math.sin(zaman * 0.4);
      else ist.teta = modelVar ? 0.2 + 0.7 * Math.sin(zaman * 0.15) : ist.teta + dt * 0.12;
    }
    const k = 1 - Math.exp(-dt * 2.2);
    kam.hedef.lerp(ist.hedef, k); kam.r += (ist.r - kam.r) * k; kam.fi += (ist.fi - kam.fi) * k;
    kam.teta += fark(kam.teta, ist.teta) * k;
    const sp = Math.sin(kam.fi);
    camera.position.set(kam.hedef.x + kam.r * sp * Math.sin(kam.teta), kam.hedef.y + kam.r * Math.cos(kam.fi),
      kam.hedef.z + kam.r * sp * Math.cos(kam.teta));
    camera.lookAt(kam.hedef);
    if (secili) {
      if (secili.malzeme) secili.malzeme.emissiveIntensity = 0.22 + 0.14 * Math.sin(zaman * 3);
      olcuSimdi += (olcuHedef - olcuSimdi) * (1 - Math.exp(-dt * 2.5));
      const y = Math.max(0.01, olcuSimdi);
      cubuk.scale.y = y; cubuk.position.y = y / 2; ustCizgi.position.y = y;
      const p = kilavuzGeo.attributes.position;
      p.setXYZ(0, 0, y, 0); p.setXYZ(1, 0, y, -kilavuzUzunluk); p.needsUpdate = true;
      kilavuz.computeLineDistances();
    }
    renderer.render(scene, camera);
    S.kareler.forEach(f => f());
    requestAnimationFrame(kare);
  }

  const v = new THREE.Vector3();
  Object.assign(S, {
    sec, genel,
    secili: () => secili,
    olcuDegeri: () => olcuSimdi,
    noktalar: () => secili ? {
      daire: secili.ust,
      olcu: new THREE.Vector3(olcu.position.x + 0.3, Math.max(olcuSimdi, 0.01) / 2, olcu.position.z),
      yol: new THREE.Vector3(secili.merkez.x + 16, 0.2, R.yol ? (R.yol.yakinZ + R.yol.uzakZ) / 2 : olcu.position.z + 3)
    } : null,
    ekran(p) {
      v.copy(p).project(camera);
      return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, gorunur: v.z > -1 && v.z < 1 };
    }
  });
  window.SAHNE = S;

  S.hazir = Promise.resolve()
    .then(() => (modelVar ? window.BINA_MODEL : window.BINA_PROSEDUREL)(ctx))
    .then(r => {
      R = r; S.daireler = r.daireler; S.kesit = r.kesit; S.plan = d => r.plan(d);
      const e = r.olcek * 2.2, c = r.bina.merkez;
      Object.assign(gunes.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: e * 5 });
      gunes.position.set(c.x + 45, 75, c.z + 60); gunes.target.position.copy(c); scene.add(gunes.target);
      gunes.shadow.camera.updateProjectionMatrix();
      genel(); kam.hedef.copy(ist.hedef); kam.r = ist.r;
      requestAnimationFrame(kare);
      return S;
    });
  S.hazir.catch(e => {
    console.error("Sahne kurulamadı:", e);
    const a = document.getElementById("projeAlt"); if (a) a.textContent = "Model yüklenemedi: " + (e && e.message || e);
  });
})();
