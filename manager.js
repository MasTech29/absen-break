// PROTEKSI - Kalo belum login, tendang ke login
if(localStorage.getItem('managerLogin')!=='true'){ window.location.href='manager-login.html'; }

const MODEL_URL='https://justadudewhohacks.github.io/face-api.js/models';
let modelsLoaded=false;
function getKaryawan(){return JSON.parse(localStorage.getItem('karyawan')||'[]')}
function saveKaryawan(d){localStorage.setItem('karyawan',JSON.stringify(d))}
function getAbsen(){return JSON.parse(localStorage.getItem('absen')||'[]')}
function saveAbsen(d){localStorage.setItem('absen',JSON.stringify(d))}
function logout(){ localStorage.removeItem('managerLogin'); window.location.href='manager-login.html'; }

function showTabManager(n){
  ['live','rekap','karyawan','setting'].forEach(t=>document.getElementById('tab-'+t).classList.toggle('hidden',t!==n));
  if(n==='live') renderLive(); if(n==='rekap') renderRekap(); if(n==='karyawan') renderKaryawan();
}

async function initManager(){
  try{
    await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)]);
    modelsLoaded=true; document.getElementById('status').innerText='✅ Manager siap';
    const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});
    document.getElementById('video').srcObject=s;
  }catch(e){document.getElementById('status').innerText='⚠️ Kamera gagal, tapi dashboard tetep jalan'}
  document.getElementById('maxBreak').value = localStorage.getItem('maxBreak')||30;
  renderLive(); renderKaryawan();
}

async function daftarWajahManager(){
  const nama=document.getElementById('namaBaru').value.trim(); const id=document.getElementById('idBaru').value.trim();
  if(!nama||!id){alert('Isi nama & ID');return}
  const det=await faceapi.detectSingleFace(document.getElementById('video'),new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
  if(!det){alert('Wajah gak ketemu');return}
  let list=getKaryawan().filter(k=>k.id!==id); list.push({nama,id,descriptor:Array.from(det.descriptor)}); saveKaryawan(list);
  alert(`✅ ${nama} terdaftar`); renderKaryawan();
}
function renderKaryawan(){
  const list=getKaryawan(); document.getElementById('jmlKaryawan').innerText=list.length;
  document.getElementById('listKaryawan').innerHTML=list.map(k=>`<div class="karyawan-item"><span>${k.nama} (${k.id})</span><button onclick="hapusKaryawan('${k.id}')">Hapus</button></div>`).join('')||'<p>Belum ada</p>';
}
function hapusKaryawan(id){if(confirm('Hapus?')){saveKaryawan(getKaryawan().filter(k=>k.id!==id));renderKaryawan();}}
function renderLive(){
  const absen=getAbsen().filter(a=>a.status==='On Break');
  document.getElementById('liveList').innerHTML=absen.length?`<table><tr><th>Nama</th><th>Mulai</th><th>Status</th></tr>${absen.map(a=>`<tr><td>${a.nama}</td><td>${a.jamMulai}</td><td><span class="badge on">On Break</span></td></tr>`).join('')}</table>`:'<p>Semua lagi kerja, ga ada yang break</p>';
}
function renderRekap(){
  const absen=getAbsen().slice().reverse();
  document.getElementById('rekapList').innerHTML=`<table><tr><th>Nama</th><th>Tgl</th><th>Mulai</th><th>Selesai</th><th>Status</th></tr>${absen.map(a=>`<tr><td>${a.nama}</td><td>${a.tanggal}</td><td>${a.jamMulai}</td><td>${a.jamSelesai}</td><td>${a.status}</td></tr>`).join('')}</table>`;
}
function exportCSV(){
  let csv='Tanggal,Nama,ID,Mulai,Selesai,Status\n'; getAbsen().forEach(a=>csv+=`${a.tanggal},${a.nama},${a.id},${a.jamMulai},${a.jamSelesai},${a.status}\n`);
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='rekap-break.csv'; a.click();
}
function hapusAbsen(){if(confirm('Hapus semua rekap?')){localStorage.removeItem('absen');renderLive();renderRekap();}}
function simpanSetting(){
  localStorage.setItem('maxBreak',document.getElementById('maxBreak').value);
  const pin=document.getElementById('pinBaru').value; if(pin) localStorage.setItem('managerPin',pin);
  document.getElementById('settingMsg').innerText='✅ Setting tersimpan';
}
initManager();