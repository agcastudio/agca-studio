// Bir sonraki Pazartesi'nin tarihini (YYYY-MM-DD) yazar. Pazar günü çalıştırılınca yarını verir.
const d = new Date(); const dow = d.getDay(); const add = dow === 0 ? 1 : 8 - dow;
d.setDate(d.getDate() + add);
console.log(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
