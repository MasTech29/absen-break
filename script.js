const video = document.getElementById('video');
const statusEl = document.getElementById('status');
let modelsLoaded = false;

async function init(){
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  try{
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
    if(statusEl) statusEl.innerText = '✅ Model siap! Silahkan scan';
    startVideo();
  }catch(e){
    if(statusEl) statusEl.innerText = '❌ Gagal load model, cek internet lalu refresh';
  }
}

async function startVideo(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video:{ 
        facingMode: "user", // WAJIB kamera depan di HP
        width: { ideal: 320 },
        height: { ideal: 240 }
      }, 
      audio: false 
    });
    video.srcObject = stream;
    video.play();
  }catch(e){
    if(statusEl) statusEl.innerText = '❌ Kamera ke-block! Klik gembok di address bar -> Camera -> Allow -> Refresh';
  }
}

async function getDescriptor(){
  // inputSize dikecilin biar HP kentang ga ngelag
  const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptor();
  return det ? det.descriptor : null;
}

async function daftarWajah(){
  const nama = document.getElementById('regNama').value.trim();
  const id = document.getElementById('regId').value.trim().toUpperCase();
  const msg = document.getElementById('regMsg');
  if(!nama || !id){ msg.innerText='❌ Isi Nama & ID dulu!'; return; }
  if(!modelsLoaded){ msg.innerText='⏳ Model belum siap, tunggu...'; return; }
  msg.innerText='📸 Lagi scan wajah, diam bentar...';
  const desc = await getDescriptor();
  if(!desc){ msg.innerText='❌ Wajah ga ke-detect! Maju dikit, cari cahaya terang'; return; }
  let users = JSON.parse(localStorage.getItem('users')||'[]');
  users = users.filter(u=>u.id!==id);
  users.push({ id, nama, descriptor: Array.from(desc) });
  localStorage.setItem('users', JSON.stringify(users));
  msg.innerText = `✅ Berhasil! ${nama} (${id}) udah terdaftar`;
  document.getElementById('regNama').value='';
  document.getElementById('regId').value='';
  updateTerdaftar();
}

function updateTerdaftar(){
  const el=document.getElementById('daftarTerdaftar'); if(!el) return;
  const users=JSON.parse(localStorage.getItem('users')||'[]');
  el.innerText = users.length? `Terdaftar: ${users.map(u=>u.nama+' ('+u.id+')').join(', ')}` : 'Belum ada wajah terdaftar';
}

async function handleScan(mode){
  const resultEl = document.getElementById('result');
  if(!modelsLoaded){ resultEl.innerText='⏳ Model belum siap...'; return; }
  resultEl.innerText='📸 Lagi scan...';
  const desc = await getDescriptor();
  if(!desc){ resultEl.innerText='❌ Wajah ga ke-detect! Deketin HP dikit'; return; }
  const users = JSON.parse(localStorage.getItem('users')||'[]');
  if(!users.length){ resultEl.innerText='❌ Belum ada karyawan, daftar dulu'; return; }
  let best=null, bestDist=0.6;
  users.forEach(u=>{
    const d = faceapi.euclideanDistance(desc, new Float32Array(u.descriptor));
    if(d<bestDist){ bestDist=d; best=u; }
  });
  if(!best){ resultEl.innerText='❌ Wajah tidak dikenal! Daftar dulu'; return; }
  const MAX_BREAK = parseInt(localStorage.getItem('maxBreak') || '30');
  let logs = JSON.parse(localStorage.getItem('breakLogs')||'[]');
  if(mode==='break'){
    if(logs.find(l=>l.id===best.id && !l.resumeAt)){ resultEl.innerText=`⚠️ ${best.nama} lagi break!`; return; }
    logs.push({ id:best.id, nama:best.nama, breakAt: Date.now(), resumeAt:null, durasi:null });
    localStorage.setItem('breakLogs', JSON.stringify(logs));
    resultEl.innerText=`✅ ${best.nama} mulai BREAK! Batas: ${MAX_BREAK} menit`;
  } else {
    const log = [...logs].reverse().find(l=>l.id===best.id && !l.resumeAt);
    if(!log){ resultEl.innerText=`⚠️ ${best.nama} belum mulai break!`; return; }
    log.resumeAt = Date.now();
    log.durasi = Math.round((log.resumeAt - log.breakAt)/60000);
    log.status = log.durasi > MAX_BREAK ? 'TELAT' : 'ON TIME';
    localStorage.setItem('breakLogs', JSON.stringify(logs));
    if(log.durasi > MAX_BREAK){
      resultEl.innerText=`⛔ ${best.nama} TELAT! ${log.durasi} menit, batas ${MAX_BREAK} menit`;
    } else {
      resultEl.innerText=`✅ ${best.nama} selesai BREAK! Durasi: ${log.durasi} menit`;
    }
  }
}

init();
setTimeout(updateTerdaftar, 1000);