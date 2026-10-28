const fs = require('fs');

const h = 1 / 240;
const I_wheel = 1.0;
const arc = (2 * Math.PI) / 16;
const POINTER_ANGLE = 1.5 * Math.PI;

const N_SIMS = 10000;
const startTime = Date.now();
const results = [];

for (let i = 0; i < N_SIMS; i++) {
  // Geniş ve çeşitli parametre uzayı
  const tauC = 0.15 + Math.random() * 1.15;            // 0.15 - 1.30 N·m
  const b = 0.02 + Math.random() * 0.14;               // 0.02 - 0.16 N·m·s
  const w0 = 20.0 + Math.random() * 22.0;              // 20.0 - 42.0 rad/s
  const pegTorqueMag = 1.5 + Math.random() * 5.0;      // 1.5 - 6.5 N·m
  const pegRadiusAngle = 0.060 + Math.random() * 0.065;// 0.060 - 0.125 rad
  const kFlapper = 800 + Math.random() * 1400;         // 800 - 2200 N·m

  let wheelRotation = 0;
  let omega = w0;
  let quietSettleTime = 0;
  let totalTime = 0;
  let totalTicks = 0;
  let lastContact = false;
  let steps = 0;
  const maxSteps = 240 * 25; // max 25s

  while (steps < maxSteps) {
    steps++;
    totalTime += h;

    const curRel = ((POINTER_ANGLE - wheelRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pegDist = curRel % arc;
    let pegTorque = 0;
    let contact = false;

    if (pegDist < pegRadiusAngle) {
      contact = true;
      const penetration = Math.max(0, Math.min(1, (pegRadiusAngle - pegDist) / pegRadiusAngle));
      pegTorque = -pegTorqueMag * Math.sin(penetration * Math.PI) * Math.tanh(omega / 0.04);
    }

    if (lastContact && !contact && Math.abs(omega) > 0.05) {
      totalTicks++;
    }
    lastContact = contact;

    const fric = tauC * Math.tanh(omega / 0.03) + b * omega;
    const alpha = (-fric + pegTorque) / I_wheel;
    omega += alpha * h;
    wheelRotation += omega * h;

    if (Math.abs(omega) < 0.015) {
      quietSettleTime += h;
      if (quietSettleTime > 0.025) {
        omega = 0;
      }
    } else {
      quietSettleTime = 0;
    }

    if (quietSettleTime >= 0.10) break;
  }

  const rotations = wheelRotation / (2 * Math.PI);

  // 1. Dönüş Süresi Skoru (30 puan)
  let timeScore = 0;
  if (totalTime >= 10.5 && totalTime <= 13.5) timeScore = 30;
  else if (totalTime >= 9.0 && totalTime <= 15.0) timeScore = 24;
  else if (totalTime >= 7.0 && totalTime <= 18.0) timeScore = 15;
  else timeScore = Math.max(0, 30 - Math.abs(totalTime - 12.0) * 4);

  // 2. Tur Sayısı Skoru (25 puan)
  let rotScore = 0;
  if (rotations >= 14 && rotations <= 18) rotScore = 25;
  else if (rotations >= 12 && rotations <= 21) rotScore = 20;
  else rotScore = Math.max(0, 25 - Math.abs(rotations - 16) * 3);

  // 3. Tırnak Ritim & Vuruş Hissiyatı Skoru (25 puan)
  const ticksPerRot = totalTicks / Math.max(1, rotations);
  let pegScore = 0;
  if (ticksPerRot >= 15.2 && ticksPerRot <= 16.5) pegScore = 25;
  else pegScore = Math.max(5, 25 - Math.abs(ticksPerRot - 16) * 6);

  // 4. Eylemsizlik & Sönümlenme Oranı Skoru (20 puan)
  const ratio = (tauC / (b * 10));
  let balanceScore = 0;
  if (ratio >= 0.65 && ratio <= 1.35) balanceScore = 20;
  else balanceScore = Math.max(5, 20 - Math.abs(ratio - 1.0) * 12);

  const totalScore = Math.round(timeScore + rotScore + pegScore + balanceScore);
  const stars = totalScore >= 90 ? 5 : (totalScore >= 75 ? 4 : (totalScore >= 55 ? 3 : (totalScore >= 35 ? 2 : 1)));

  // Gerekçelendirme açıklaması (Reason)
  let reason = "";
  if (stars === 5) {
    reason = `Mükemmel denge: ${totalTime.toFixed(1)}s dönüş, ${rotations.toFixed(1)} tur. Rulman ve hava sürtünmesi tok bir süzülüş sağladı.`;
  } else if (stars === 4) {
    reason = `Çok iyi: ${totalTime.toFixed(1)}s dönüş, ${rotations.toFixed(1)} tur. Küçük parametre oynamasıyla 5 yıldıza çıkabilir.`;
  } else if (stars === 3) {
    reason = `Ortalama: Süre veya tur sayısı ideal aralığın biraz dışında (${totalTime.toFixed(1)}s, ${rotations.toFixed(1)} tur).`;
  } else if (stars === 2) {
    reason = `Zayıf: Ya çok erken durdu (${totalTime.toFixed(1)}s) ya da aşırı uzadı, tırnak vuruşları ritimsiz.`;
  } else {
    reason = `Elendi: Aşırı sert fren veya enerjisiz fırlatma (${totalTime.toFixed(1)}s, ${rotations.toFixed(1)} tur).`;
  }

  results.push({
    id: i + 1,
    tauC: Math.round(tauC * 100) / 100,
    b: Math.round(b * 100) / 100,
    w0: Math.round(w0 * 10) / 10,
    pegTorque: Math.round(pegTorqueMag * 10) / 10,
    pegHitbox: Math.round(pegRadiusAngle * 1000) / 1000,
    kFlapper: Math.round(kFlapper),
    time: Math.round(totalTime * 10) / 10,
    rotations: Math.round(rotations * 10) / 10,
    totalTicks,
    score: totalScore,
    stars,
    reason
  });
}

const elapsedMs = Date.now() - startTime;

// İstatistikler
results.sort((a, b) => b.score - a.score);

const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
results.forEach(r => starCounts[r.stars]++);

// Tüm 10.000 çevirmenin ortalaması
const overallAvg = {
  tauC: Math.round((results.reduce((s, r) => s + r.tauC, 0) / N_SIMS) * 100) / 100,
  b: Math.round((results.reduce((s, r) => s + r.b, 0) / N_SIMS) * 100) / 100,
  w0: Math.round((results.reduce((s, r) => s + r.w0, 0) / N_SIMS) * 10) / 10,
  pegTorque: Math.round((results.reduce((s, r) => s + r.pegTorque, 0) / N_SIMS) * 10) / 10,
  pegHitbox: Math.round((results.reduce((s, r) => s + r.pegHitbox, 0) / N_SIMS) * 1000) / 1000,
  kFlapper: Math.round(results.reduce((s, r) => s + r.kFlapper, 0) / N_SIMS),
  time: Math.round((results.reduce((s, r) => s + r.time, 0) / N_SIMS) * 10) / 10,
  rotations: Math.round((results.reduce((s, r) => s + r.rotations, 0) / N_SIMS) * 10) / 10,
  score: Math.round((results.reduce((s, r) => s + r.score, 0) / N_SIMS) * 10) / 10
};

// SADECE 5 YILDIZLI (En İyi) Ayarların Ağırlıklı Ortalaması (Kullanıcının istediği Elit Ortalama)
const fiveStars = results.filter(r => r.stars === 5);
const fiveStarCount = fiveStars.length;

let wTotal = 0;
let wTauC = 0, wB = 0, wW0 = 0, wPegT = 0, wPegH = 0, wKF = 0, wTime = 0, wRot = 0, wScore = 0;

fiveStars.forEach(r => {
  const w = r.score; // puana göre ağırlıklandır
  wTotal += w;
  wTauC += r.tauC * w;
  wB += r.b * w;
  wW0 += r.w0 * w;
  wPegT += r.pegTorque * w;
  wPegH += r.pegHitbox * w;
  wKF += r.kFlapper * w;
  wTime += r.time * w;
  wRot += r.rotations * w;
  wScore += r.score * w;
});

const fiveStarWeightedAvg = {
  count: fiveStarCount,
  tauC: Math.round((wTauC / wTotal) * 100) / 100,
  b: Math.round((wB / wTotal) * 100) / 100,
  w0: Math.round((wW0 / wTotal) * 10) / 10,
  pegTorque: Math.round((wPegT / wTotal) * 10) / 10,
  pegHitbox: Math.round((wPegH / wTotal) * 1000) / 1000,
  kFlapper: Math.round(wKF / wTotal),
  time: Math.round((wTime / wTotal) * 10) / 10,
  rotations: Math.round((wRot / wTotal) * 10) / 10,
  score: Math.round((wScore / wTotal) * 10) / 10
};

const top15 = results.slice(0, 15);
const worst5 = results.slice(-5);

const outputData = {
  totalSims: N_SIMS,
  elapsedMs,
  starCounts,
  overallAvg,
  fiveStarWeightedAvg,
  top15,
  worst5
};

fs.writeFileSync('/data/data/com.termux/files/home/carkifelek/reports/sim_10k_results.json', JSON.stringify(outputData, null, 2));
console.log("10.000 Simülasyon Başarıyla Tamamlandı!");
console.log(`Geçen Süre: ${elapsedMs} ms`);
console.log("5 Yıldızlı Sayısı:", starCounts[5]);
console.log("5 Yıldızlıların Ağırlıklı Ortalaması:", fiveStarWeightedAvg);
