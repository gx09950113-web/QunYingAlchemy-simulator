// scripts/scripts.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// ✅ 初始化 Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBEgS2lZYqSrr1FV5X0EzfrRQq_C4D1-Tc",
  authDomain: "alchemygame-37ea5.firebaseapp.com",
  projectId: "alchemygame-37ea5",
  storageBucket: "alchemygame-37ea5.appspot.com",
  messagingSenderId: "149160496683",
  appId: "1:149160496683:web:2ef9826985a4bd3f1c646e",
  measurementId: "G-59PLBST54N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let recipes = [];

// ✅ 動態載入藥材資料
async function loadHerbs() {
  const herbContainer = document.getElementById('herbContainer');
  if (!herbContainer) return;

  try {
    const snapshot = await getDocs(collection(db, "herbs"));

    if (snapshot.empty) {
      herbContainer.innerHTML = "<p>目前尚無可用藥材。</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const herb = doc.data();

      const label = document.createElement("label");
      label.style.display = "inline-block";
      label.style.marginRight = "10px";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "herbs";
      checkbox.value = herb.name;

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + herb.name));
      herbContainer.appendChild(label);
    });
  } catch (error) {
    console.error("載入藥材失敗：", error);
    herbContainer.innerHTML = "<p>載入藥材失敗。</p>";
  }
}

// ✅ 載入配方資料
async function loadRecipes() {
  try {
    const snapshot = await getDocs(collection(db, "recipes"));
    recipes = snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("載入配方失敗：", error);
  }
}

// ✅ 模擬煉藥
window.simulateAlchemy = function () {
  const selectedHerbs = Array.from(document.querySelectorAll('input[name="herbs"]:checked')).map(el => el.value);
  const fireType = document.getElementById('fireType').value;
  const resultDiv = document.getElementById('result');
  const burnSound = document.getElementById('burnSound');

  let resultText = "";

  burnSound.currentTime = 0;
  burnSound.play();

  // 比對配方
  const matchedRecipe = recipes.find(recipe => {
    const requiredHerbs = recipe.ingredients.sort().join(',');
    const selectedKey = selectedHerbs.sort().join(',');
    return recipe.fire === fireType && selectedKey === requiredHerbs;
  });

  if (matchedRecipe) {
    const successRate = Math.floor(Math.random() * 70) + 30; // 30~99%
    if (successRate >= 50) {
      resultText = `✅ 煉製成功！獲得【${matchedRecipe.name}】（成功率 ${successRate}%）`;
    } else {
      resultText = `❌ 火候失當，煉製【${matchedRecipe.name}】失敗！（成功率 ${successRate}%）`;
    }
  } else {
    resultText = `❌ 無效配方！煉出一鍋黑色糊糊……`;
  }

  resultDiv.innerText = resultText;
};

// ✅ 控制 BGM
window.addEventListener("DOMContentLoaded", async () => {
  await loadHerbs();
  await loadRecipes();

  const bgm = document.getElementById('bgm');
  const toggleBGMButton = document.getElementById('toggleBGM');

  toggleBGMButton.addEventListener("click", () => {
    if (bgm.paused) {
      bgm.play();
      toggleBGMButton.innerText = "⏸️ 暫停音樂";
    } else {
      bgm.pause();
      toggleBGMButton.innerText = "🎵 播放音樂";
    }
  });
});
