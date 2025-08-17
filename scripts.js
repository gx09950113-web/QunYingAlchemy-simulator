const herbListDiv = document.getElementById('herbList');
const resultDiv = document.getElementById('result');
const burnSound = document.getElementById('burnSound');
const bgm = document.getElementById('bgm');
const toggleBGMButton = document.getElementById('toggleBGM');

let recipes = []; // 🔥 這裡儲存來自 Firebase 的配方資料

// 載入藥材列表
async function loadHerbs() {
  const snapshot = await db.collection("herbs").get();
  snapshot.forEach(doc => {
    const herb = doc.data();
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${herb.name}" class="herb-select"> ${herb.name}<br>`;
    herbListDiv.appendChild(label);
  });
}

// 載入配方資料
async function loadRecipes() {
  const snapshot = await db.collection("recipes").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    recipes.push({
      name: data.name,
      ingredients: data.ingredients.sort(), // 確保排序一致
    });
  });
}

// 主邏輯：煉藥流程
function simulateAlchemy() {
  const selectedHerbs = Array.from(document.querySelectorAll('.herb-select:checked')).map(el => el.value);
  const fireType = document.getElementById("fireType").value;

  if (selectedHerbs.length === 0) {
    resultDiv.innerText = "請選擇至少一味藥材。";
    return;
  }

  burnSound.currentTime = 0;
  burnSound.play();

  // 對照是否有正確配方
  const sortedSelected = selectedHerbs.slice().sort(); // 排序後比對
  const matchedRecipe = recipes.find(recipe =>
    JSON.stringify(recipe.ingredients) === JSON.stringify(sortedSelected)
  );

  let resultText = `你使用了「${selectedHerbs.join('、')}」，以「${fireType}」煉丹……\n`;

  if (matchedRecipe) {
    const successRate = Math.floor(Math.random() * 70) + 30; // 30~99%
    if (successRate >= 50) {
      resultText += `✅ 煉製成功！獲得【${matchedRecipe.name}】（成功率 ${successRate}%）`;
    } else {
      resultText += `❌ 火候失當，煉製【${matchedRecipe.name}】失敗！（成功率 ${successRate}%）`;
    }
  } else {
    resultText += `❌ 無效配方！煉出一鍋黑色糊糊……`;
  }

  resultDiv.innerText = resultText;
}

// 控制 BGM
toggleBGMButton.addEventListener("click", () => {
  if (bgm.paused) {
    bgm.play();
    toggleBGMButton.innerText = "⏸️ 暫停音樂";
  } else {
    bgm.pause();
    toggleBGMButton.innerText = "🎵 播放音樂";
  }
});

// 初始化：載入藥材與配方
window.addEventListener("DOMContentLoaded", async () => {
  await loadHerbs();
  await loadRecipes();
});
