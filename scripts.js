// ==============================
// 煉藥模擬器 scripts.js（本地 JSON 版）
// - 讀取：data/herbs.json、data/recipes.json
// - herbs 支援：["名稱", ...] 或 [{name, emoji?, effects?}, ...]
// - 規則：藥材任選；配方 & 火候完全符合→成功（良率 30~99%）；否則→一鍋糊糊
// - 內建：QunYing.mp3 播放/暫停、BGM/SFX 音量、📘 圖鑑（含搜尋）
// ==============================

const HERBS_URL   = "data/herbs.json";
const RECIPES_URL = "data/recipes.json";

// DOM（等 DOMContentLoaded 後再抓更保險；但先宣告容器）
let statusEl, herbBox, resultEl, cauldron, brewBtn, resetBtn;
let bgm, bgmToggle, bgmVol, sfxVol, burnSound, brewSound, successSfx, failSfx;
let dexBtn, dexModal, dexClose, dexSearch, dexList;

// 狀態
let HERB_LIST = [];        // string[] 或 {name, emoji?, effects?}[]
let HERB_META = new Map(); // name -> {emoji?, effects?}
let RECIPES   = [];        // {name, materials:string[], fire, type?}

// ===== 小工具 =====
const asSetEq = (a, b) => {
  const A = new Set(a), B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randYieldPercent = () => randInt(30, 99);
const byStroke = (a, b) => a.localeCompare(b, "zh-Hant-u-co-stroke");
const setVol = (el, v) => { if (el && typeof el.volume === "number") el.volume = v; };

async function fetchJSON(url) {
  const abs = new URL(url, window.location.href).toString();
  const res = await fetch(abs, { cache: "no-cache" });
  if (!res.ok) {
    const msg = `[${res.status}] ${res.statusText} @ ${abs}`;
    throw new Error(msg);
  }
  return res.json();
}

function unionMaterials(recipes) {
  const s = new Set();
  for (const r of recipes) for (const m of (r.materials || [])) s.add(m);
  return Array.from(s).sort(byStroke);
}

function buildHerbMeta(herbList) {
  const map = new Map();
  herbList.forEach(item => {
    if (typeof item === "string") map.set(item, {});
    else if (item && item.name) map.set(item.name, { emoji: item.emoji || "", effects: item.effects || "" });
  });
  return map;
}

// ===== UI：藥材渲染 =====
function renderHerbs(list) {
  herbBox.innerHTML = "";
  if (!list?.length) {
    herbBox.innerHTML = `<div class="hint">（沒有可選藥材）請確認 /data/herbs.json 或 /data/recipes.json</div>`;
    return;
  }
  list.forEach(item => {
    const isStr = typeof item === "string";
    const name    = isStr ? item : item.name;
    const emoji   = isStr ? ""   : (item.emoji || "");
    const effects = isStr ? ""   : (item.effects || "");

    const label = document.createElement("label");
    label.className = "herb";

    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.name = "herbs"; cb.value = name;

    label.appendChild(cb);
    label.appendChild(document.createTextNode(` ${emoji} ${name}`));
    if (effects) {
      const small = document.createElement("small");
      small.className = "effects";
      small.textContent = " " + effects;
      label.appendChild(small);
    }
    herbBox.appendChild(label);
  });
}

// ===== UI：取得選擇 =====
const getSelectedHerbs = () =>
  Array.from(document.querySelectorAll('input[name="herbs"]:checked')).map(x => x.value);

const getFireType = () => {
  const r = document.querySelector('input[name="fire"]:checked');
  return r ? r.value : null;
};

function animateCauldron() {
  cauldron.classList.add("boil");
  setTimeout(() => cauldron.classList.remove("boil"), 900);
}
function play(el, vol) {
  try { setVol(el, vol); el.currentTime = 0; el.play().catch(() => {}); } catch {}
}

// ===== 圖鑑（Dex）=====
function openDex() { if (dexModal) { dexModal.hidden = false; dexSearch?.focus(); } }
function closeDex() { if (dexModal) { dexModal.hidden = true; if (dexSearch) dexSearch.value = ""; renderDex(RECIPES); } }

function materialLabel(name) {
  const meta = HERB_META.get(name) || {};
  return `${meta.emoji ? meta.emoji + " " : ""}${name}`;
}

function renderDex(recipes, keyword = "") {
  if (!dexList) return;
  const kw = keyword.trim();
  const list = kw
    ? recipes.filter(r =>
        r.name.includes(kw) || r.materials.some(m => m.includes(kw))
      )
    : recipes;

  if (!list.length) {
    dexList.innerHTML = `<div class="hint">（無符合的配方）</div>`;
    return;
  }

  dexList.innerHTML = list.map(r => {
    const chips = r.materials.map(materialLabel).map(x => `<span class="dex-chip">${x}</span>`).join("");
    return `
      <div class="dex-card">
        <p class="dex-title">${r.name}${r.type ? `（${r.type}）` : ""} — <span class="muted">${r.fire}</span></p>
        <div class="dex-mats">${chips}</div>
      </div>
    `;
  }).join("");
}

// ===== 煉藥主流程 =====
function brewOnce() {
  const chosen = getSelectedHerbs();
  const fire   = getFireType();

  if (!fire) { resultEl.innerHTML = `<p>⚠️ 請先選擇火候。</p>`; return; }
  if (!chosen.length) { resultEl.innerHTML = `<p>⚠️ 請至少選擇一味藥材。</p>`; return; }

  if (fire === "免用火") { try { burnSound?.pause(); if (burnSound) burnSound.currentTime = 0; } catch {} }
  else { play(burnSound, 0.6); }

  animateCauldron();
  play(brewSound, Number(sfxVol?.value || 0.8));

  const matched = RECIPES.find(r => r.fire === fire && asSetEq(r.materials, chosen));

  if (!matched) {
    resultEl.innerHTML = `
      <p>❌ 你煉出了一鍋 <strong>黑不溜丟的糊糊</strong>。</p>
      <p class="muted">（需同時符合配方材料與火候，順序無關）</p>
    `;
    play(failSfx, Number(sfxVol?.value || 0.8));
    return;
  }

  const yieldPct = randYieldPercent();
  resultEl.innerHTML = `
    <p>✅ 成功煉成：<strong>${matched.name}</strong>${matched.type ? `（${matched.type}）` : ""}</p>
    <p>本次良率：<strong>${yieldPct}%</strong></p>
  `;
  play(successSfx, Number(sfxVol?.value || 0.8));
}

// ===== 啟動流程 =====
async function loadAllData() {
  const [recipes, herbsMaybe] = await Promise.all([
    fetchJSON(RECIPES_URL),
    fetchJSON(HERBS_URL).catch(() => null)
  ]);
  const herbs = herbsMaybe?.length ? herbsMaybe : unionMaterials(recipes);
  return { recipes, herbs, source: herbsMaybe ? "json" : "json-unioned" };
}

async function boot() {
  try {
    if (statusEl) statusEl.textContent = "讀取本地資料中（/data/*.json）…";

    const { recipes, herbs, source } = await loadAllData();
    RECIPES = recipes;
    HERB_LIST = herbs;
    HERB_META = buildHerbMeta(HERB_LIST);

    renderHerbs(HERB_LIST);
    renderDex(RECIPES);

    // 安全設定音量
    const sfx = Number(sfxVol?.value || 0.8);
    setVol(brewSound,  sfx);
    setVol(successSfx, sfx);
    setVol(failSfx,    sfx);
    setVol(burnSound,  0.6);

    const bgmv = Number(bgmVol?.value || 0.6);
    setVol(bgm, bgmv);

    if (statusEl) {
      statusEl.textContent = `已載入（${source}）：配方 ${RECIPES.length}、藥材 ${Array.from(HERB_META.keys()).length}`;
      statusEl.classList.add("ok");
    }
  } catch (e) {
    console.error(e);
    if (statusEl) {
      statusEl.innerHTML = `❌ 無法讀取本地 JSON。<br><small>${e?.message || e}</small><br>
      提示：請用本地伺服器（Live Server / python -m http.server）、確認 /data/*.json 路徑與 JSON 格式。`;
      statusEl.classList.add("bad");
    }
    renderHerbs([]);
  }
}

// ===== 綁定：在 DOM 準備好後 =====
window.addEventListener("DOMContentLoaded", () => {
  // 取得 DOM
  statusEl   = document.getElementById("status");
  herbBox    = document.getElementById("herbContainer");
  resultEl   = document.getElementById("result");
  cauldron   = document.getElementById("cauldron");
  brewBtn    = document.getElementById("brewBtn");
  resetBtn   = document.getElementById("resetBtn");

  bgm        = document.getElementById("bgm");
  bgmToggle  = document.getElementById("bgmToggle");
  bgmVol     = document.getElementById("bgmVol");
  sfxVol     = document.getElementById("sfxVol");
  burnSound  = document.getElementById("burnSound");
  brewSound  = document.getElementById("brewSound");
  successSfx = document.getElementById("successSfx");
  failSfx    = document.getElementById("failSfx");

  dexBtn     = document.getElementById("dexBtn");
  dexModal   = document.getElementById("dexModal");
  dexClose   = document.getElementById("dexClose");
  dexSearch  = document.getElementById("dexSearch");
  dexList    = document.getElementById("dexList");

  // 事件：煉藥／重置
  brewBtn?.addEventListener("click", brewOnce);
  resetBtn?.addEventListener("click", () => {
    document.querySelectorAll('input[name="herbs"]').forEach(cb => (cb.checked = false));
    document.querySelectorAll('input[name="fire"]').forEach(r => (r.checked = false));
    if (resultEl) resultEl.textContent = "尚未開始";
    try { burnSound?.pause(); if (burnSound) burnSound.currentTime = 0; } catch {}
  });

  // 事件：BGM 控制（手動播放/暫停，符合自動播放政策）
  bgmToggle?.addEventListener("click", async () => {
    if (!bgm) return;
    try {
      if (bgm.paused) {
        await bgm.play();
        bgmToggle.textContent = "⏸ 暫停";
      } else {
        bgm.pause();
        bgmToggle.textContent = "🎵 播放";
      }
    } catch (e) { console.warn("BGM 播放失敗：", e?.name || e); }
  });
  bgmVol?.addEventListener("input", () => setVol(bgm, Number(bgmVol.value)));
  sfxVol?.addEventListener("input", () => {
    const v = Number(sfxVol.value);
    setVol(brewSound, v); setVol(successSfx, v); setVol(failSfx, v);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && bgmToggle?.textContent?.includes("暫停") && bgm?.paused) {
      bgm.play().catch(() => {});
    }
  });

  // 事件：圖鑑
  dexBtn?.addEventListener("click", openDex);
  dexClose?.addEventListener("click", closeDex);
  dexModal?.addEventListener("click", (e) => {
    if (e.target && e.target.getAttribute("data-close") !== null) closeDex();
  });
  dexSearch?.addEventListener("input", () => renderDex(RECIPES, dexSearch.value));

  // 啟動
  boot();
});
