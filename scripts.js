// 純煉藥模擬器（依附件 recipes 結構）
// 規則：
// 1) 可勾選任意藥材
// 2) 配方或火候不符 → 一鍋糊糊
// 3) 配方與火候都正確 → 良率隨機 30%~99%
// 4) herbs 來源：優先讀 /herbs（若不存在或為空，則以 /recipes 的 materials 聯集當清單）

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// 你提供的 config
const firebaseConfig = {
  apiKey: "AIzaSyBEgS2lZYqSrr1FV5X0EzfrRQq_C4D1-Tc",
  authDomain: "alchemygame-37ea5.firebaseapp.com",
  projectId: "alchemygame-37ea5",
  storageBucket: "alchemygame-37ea5.firebasestorage.app",
  messagingSenderId: "149160496683",
  appId: "1:149160496683:web:2ef9826985a4bd3f1c646e",
  measurementId: "G-59PLBST54N"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// DOM
const statusEl   = document.getElementById("status");
const herbBox    = document.getElementById("herbContainer");
const resultEl   = document.getElementById("result");
const cauldron   = document.getElementById("cauldron");
const brewBtn    = document.getElementById("brewBtn");
const resetBtn   = document.getElementById("resetBtn");

// 音效
const burnSound  = document.getElementById("burnSound");
const brewSound  = document.getElementById("brewSound");
const successSfx = document.getElementById("successSfx");
const failSfx    = document.getElementById("failSfx");
const bgm        = document.getElementById("bgm");

const bgmVol = document.getElementById("bgmVol");
const sfxVol = document.getElementById("sfxVol");

// 狀態
let HERB_LIST = [];    // string[]
let RECIPES   = [];    // {name, materials[], fire, type}

// 工具
const asSetEq = (a,b) => {
  const A = new Set(a), B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
};
const randInt = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
const randYieldPercent = ()=> randInt(30,99); // 30~99%

// UI
function renderHerbs(names){
  herbBox.innerHTML = "";
  if (!names?.length){
    herbBox.innerHTML = `<div class="hint">（沒有可選藥材）請確認 /herbs 或 /recipes 存在資料</div>`;
    return;
  }
  names.forEach(n=>{
    const label = document.createElement("label");
    label.className = "herb";
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.name="herbs"; cb.value=n;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" "+n));
    herbBox.appendChild(label);
  });
}
const getSelectedHerbs = ()=> Array.from(document.querySelectorAll('input[name="herbs"]:checked')).map(x=>x.value);
const getFireType = ()=> {
  const r = document.querySelector('input[name="fire"]:checked');
  return r ? r.value : null;
};

const bgm = document.getElementById("bgm");
const bgmToggle = document.getElementById("bgmToggle");

bgm.volume = 0.6; // 初始音量

// 第一次互動後再播
bgmToggle.addEventListener("click", async () => {
  try {
    if (bgm.paused) {
      await bgm.play();
      bgmToggle.textContent = "⏸ 暫停";
    } else {
      bgm.pause();
      bgmToggle.textContent = "🎵 播放";
    }
  } catch (e) {
    console.error("BGM 播放失敗:", e);
  }
});


function animateCauldron(){
  cauldron.classList.add("boil");
  setTimeout(()=> cauldron.classList.remove("boil"), 900);
}
function play(el, vol){
  try{ el.volume = vol; el.currentTime=0; el.play().catch(()=>{});}catch{}
}

// Firestore
async function loadHerbs(){
  try{
    const col = collection(db, "herbs");
    const q = query(col, orderBy("name"));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(doc=>{
      const d = doc.data()||{};
      const name = d.name || doc.id;
      const enabled = d.enabled ?? true;
      if (name && enabled) list.push(name);
    });
    return list;
  }catch{ return []; }
}
async function loadRecipes(){
  const snap = await getDocs(collection(db, "recipes"));
  const list = [];
  snap.forEach(doc=>{
    const d = doc.data()||{};
    // 依附件欄位：name, materials[], fire, type
    if (!Array.isArray(d.materials)) d.materials = [];
    list.push({
      name: d.name || doc.id,
      materials: d.materials,
      fire: d.fire || "中火",
      type: d.type || ""
    });
  });
  return list;
}

function unionMaterials(recipes){
  const s = new Set();
  for (const r of recipes) for (const m of (r.materials||[])) s.add(m);
  return Array.from(s).sort((a,b)=> a.localeCompare(b,'zh-Hant-u-co-stroke'));
}

// 主流程
function brewOnce(){
  const chosen = getSelectedHerbs();
  const fire   = getFireType();

  if (!fire){ resultEl.innerHTML = `<p>⚠️ 請先選擇火候。</p>`; return; }
  if (!chosen.length){ resultEl.innerHTML = `<p>⚠️ 請至少選擇一味藥材。</p>`; return; }

  // 免用火則不放燃燒音；其餘播放
  if (fire === "免用火"){ try{ burnSound.pause(); burnSound.currentTime=0; }catch{} }
  else { play(burnSound, 0.6); }

  animateCauldron(); play(brewSound, Number(sfxVol.value));

  // 比對：有無 recipe 火候完全相同且 materials 集合等於所選（順序無關）
  const matched = RECIPES.find(r => r.fire === fire && asSetEq(r.materials, chosen));

  if (!matched){
    resultEl.innerHTML = `
      <p>❌ 你煉出了一鍋 <strong>黑不溜丟的糊糊</strong>。</p>
      <p class="muted">（提示：需同時符合配方 <em>materials</em> 與火候 <em>fire</em>，順序不影響）</p>
    `;
    play(failSfx, Number(sfxVol.value));
    return;
  }

  const yieldPct = randYieldPercent();
  resultEl.innerHTML = `
    <p>✅ 成功煉成：<strong>${matched.name}</strong>（${matched.type || "劑型未註"}）</p>
    <p>本次良率：<strong>${yieldPct}%</strong></p>
    <p class="muted">（配方/火候嚴格匹配，但良率僅落在 30%~99%）</p>
  `;
  play(successSfx, Number(sfxVol.value));
}

// 綁定
brewBtn.addEventListener("click", brewOnce);
resetBtn.addEventListener("click", ()=>{
  document.querySelectorAll('input[name="herbs"]').forEach(cb=> cb.checked=false);
  document.querySelectorAll('input[name="fire"]').forEach(r=> r.checked=false);
  resultEl.textContent = "尚未開始";
  try{ burnSound.pause(); burnSound.currentTime=0; }catch{}
});

// 音量
bgmVol.addEventListener("input", ()=> bgm.volume = Number(bgmVol.value));
sfxVol.addEventListener("input", ()=>{
  const v = Number(sfxVol.value);
  brewSound.volume = successSfx.volume = failSfx.volume = v;
});

// 啟動
(async function init(){
  try{
    statusEl.textContent = "讀取資料中（herbs / recipes）…";
    const [recipes, herbsFromCol] = await Promise.all([loadRecipes(), loadHerbs()]);
    RECIPES = recipes;

    // 藥材來源優先 /herbs；若無則用 recipes.materials 聯集
    const herbs = herbsFromCol.length ? herbsFromCol : unionMaterials(RECIPES);
    HERB_LIST = herbs;
    renderHerbs(HERB_LIST);

    // 預設音量
    bgm.volume = Number(bgmVol.value);
    const v = Number(sfxVol.value);
    brewSound.volume = successSfx.volume = failSfx.volume = v;

    statusEl.textContent = `已載入：配方 ${RECIPES.length} 筆、藥材 ${HERB_LIST.length} 筆。`;
    statusEl.classList.add("ok");
  }catch(e){
    console.error(e);
    statusEl.textContent = "❌ Firestore 連線或載入失敗，請檢查設定或權限。";
    statusEl.classList.add("bad");
    renderHerbs([]);
  }
})();

