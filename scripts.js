// 煉藥模擬器（本地 JSON 版，支援 herbs 有物件或字串兩種格式）

const HERBS_URL   = "data/herbs.json";
const RECIPES_URL = "data/recipes.json";

// ====== DOM ======
const statusEl   = document.getElementById("status");
const herbBox    = document.getElementById("herbContainer");
const resultEl   = document.getElementById("result");
const cauldron   = document.getElementById("cauldron");
const brewBtn    = document.getElementById("brewBtn");
const resetBtn   = document.getElementById("resetBtn");

// Audio
const bgm        = document.getElementById("bgm");
const bgmToggle  = document.getElementById("bgmToggle");
const bgmVol     = document.getElementById("bgmVol");
const sfxVol     = document.getElementById("sfxVol");

const burnSound  = document.getElementById("burnSound");
const brewSound  = document.getElementById("brewSound");
const successSfx = document.getElementById("successSfx");
const failSfx    = document.getElementById("failSfx");

// ====== 狀態 ======
let HERB_LIST = []; // 可以是 string 或物件
let RECIPES   = []; // { name, materials: string[], fire, type? }

// ====== 小工具 ======
const asSetEq = (a, b) => {
  const A = new Set(a), B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randYieldPercent = () => randInt(30, 99);

function unionMaterials(recipes) {
  const s = new Set();
  for (const r of recipes) for (const m of (r.materials || [])) s.add(m);
  return Array.from(s).sort((a, b) => a.localeCompare(b, "zh-Hant-u-co-stroke"));
}

// ====== UI ======
function renderHerbs(list) {
  herbBox.innerHTML = "";
  if (!list?.length) {
    herbBox.innerHTML = `<div class="hint">（沒有可選藥材）請確認 /data/herbs.json 或 /data/recipes.json</div>`;
    return;
  }

  list.forEach(item => {
    const isString = typeof item === "string";
    const name    = isString ? item : item.name;
    const emoji   = isString ? ""   : (item.emoji || "");
    const effects = isString ? ""   : (item.effects || "");

    const label = document.createElement("label");
    label.className = "herb";

    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.name = "herbs"; cb.value = name;

    label.appendChild(cb);
    label.appendChild(document.createTextNode(` ${emoji} ${name}`));

    if (effects) {
      const small = document.createElement("small");
      small.textContent = " " + effects;
      small.className = "effects";
      label.appendChild(small);
    }

    herbBox.appendChild(label);
  });
}

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
  try { el.volume = vol; el.currentTime = 0; el.play().catch(() => {}); } catch {}
}

// ====== 載入 JSON ======
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return res.json();
}

async function loadAllData() {
  const [recipes, herbsMaybe] = await Promise.all([
    fetchJSON(RECIPES_URL),
    fetchJSON(HERBS_URL).catch(() => null)
  ]);
  const herbs = herbsMaybe?.length ? herbsMaybe : unionMaterials(recipes);
  return { recipes, herbs, source: herbsMaybe ? "json" : "json-unioned" };
}

// ====== 主要流程 ======
function brewOnce() {
  const chosen = getSelectedHerbs();
  const fire   = getFireType();

  if (!fire) { resultEl.innerHTML = `<p>⚠️ 請先選擇火候。</p>`; return; }
  if (!chosen.length) { resultEl.innerHTML = `<p>⚠️ 請至少選擇一味藥材。</p>`; return; }

  if (fire === "免用火") {
    try { burnSound.pause(); burnSound.currentTime = 0; } catch {}
  } else {
    play(burnSound, 0.6);
  }

  animateCauldron();
  play(brewSound, Number(sfxVol.value));

  const matched = RECIPES.find(r => r.fire === fire && asSetEq(r.materials, chosen));

  if (!matched) {
    resultEl.innerHTML = `
      <p>❌ 你煉出了一鍋 <strong>黑不溜丟的糊糊</strong>。</p>
      <p class="muted">（需同時符合配方材料與火候，順序無關）</p>
    `;
    play(failSfx, Number(sfxVol.value));
    return;
  }

  const yieldPct = randYieldPercent();
  resultEl.innerHTML = `
    <p>✅ 成功煉成：<strong>${matched.name}</strong>${matched.type ? `（${matched.type}）` : ""}</p>
    <p>本次良率：<strong>${yieldPct}%</strong></p>
  `;
  play(successSfx, Number(sfxVol.value));
}

// ====== 綁定事件 ======
brewBtn.addEventListener("click", brewOnce);
resetBtn.addEventListener("click", () => {
  document.querySelectorAll('input[name="herbs"]').forEach(cb => (cb.checked = false));
  document.querySelectorAll('input[name="fire"]').forEach(r => (r.checked = false));
  resultEl.textContent = "尚未開始";
  try { burnSound.pause(); burnSound.currentTime = 0; } catch {}
});

// BGM 控制
bgm.volume = Number(bgmVol?.value || 0.6);
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
    console.warn("BGM 播放失敗：", e?.name || e);
  }
});
bgmVol?.addEventListener("input", () => { bgm.volume = Number(bgmVol.value); });
sfxVol?.addEventListener("input", () => {
  const v = Number(sfxVol.value);
  brewSound.volume = successSfx.volume = failSfx.volume = v;
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && bgmToggle.textContent.includes("暫停") && bgm.paused) {
    bgm.play().catch(() => {});
  }
});

// ====== 啟動 ======
(async function boot() {
  try {
    statusEl.textContent = "讀取本地資料中（/data/*.json）…";
    const { recipes, herbs, source } = await loadAllData();
    RECIPES = recipes;
    HERB_LIST = herbs;
    renderHerbs(HERB_LIST);

    const v = Number(sfxVol?.value || 0.8);
    brewSound.volume = successSfx.volume = failSfx.volume = v;

    statusEl.textContent = `已載入（${source}）：配方 ${RECIPES.length}、藥材 ${HERB_LIST.length}`;
    statusEl.classList.add("ok");
  } catch (e) {
    console.error(e);
    statusEl.innerHTML = "❌ 無法讀取本地 JSON。請確認 data/herbs.json 與 data/recipes.json 存在且正確。";
    statusEl.classList.add("bad");
    renderHerbs([]);
  }
})();
