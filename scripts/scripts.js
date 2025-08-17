// scripts.js

// 初始化 Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBEgS2lZYqSrr1FV5X0EzfrRQq_C4D1-Tc",
  authDomain: "alchemygame-37ea5.firebaseapp.com",
  projectId: "alchemygame-37ea5",
  storageBucket: "alchemygame-37ea5.appspot.com",
  messagingSenderId: "149160496683",
  appId: "1:149160496683:web:2ef9826985a4bd3f1c646e",
  measurementId: "G-59PLBST54N"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 載入所有藥材
async function loadHerbs() {
  const herbListDiv = document.getElementById('herbList');
  herbListDiv.innerHTML = ""; // 避免重複載入

  const snapshot = await db.collection("herbs").get();
  snapshot.forEach(doc => {
    const herb = doc.data();
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${herb.name}" class="herb-select"> ${herb.name}<br>`;
    herbListDiv.appendChild(label);
  });
}

// 煉丹模擬
function simulateAlchemy() {
  const selectedHerbs = Array.from(document.querySelectorAll('.herb-select:checked')).map(el => el.value);
  const fireType = document.getElementById("fireType").value;
  const resultDiv = document.getElementById("result");

  if (selectedHerbs.length === 0) {
    resultDiv.innerText = "請選擇至少一味藥材。";
    return;
  }

  let resultText = `你使用了「${selectedHerbs.join('、')}」，以「${fireType}」煉藥……\n`;
  const successRate = Math.floor(Math.random() * 100);

  if (successRate > 50) {
    resultText += `✅ 成功！你煉出了一鍋看起來不錯的丹藥！（成功率 ${successRate}%）`;
  } else {
    resultText += `❌ 煉丹失敗，藥材燒焦了……（成功率 ${successRate}%）`;
  }

  resultDiv.innerText = resultText;
}

// BGM 播放控制
let player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('bgmPlayer', {
    videoId: 'H0nBhA27oDM', // 替換為你的代碼
    events: {
      'onReady': event => event.target.setLoop(true)
    }
  });
}

function toggleMusic() {
  if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else if (player) {
    player.playVideo();
  }
}

// 載入初始資料
window.onload = function () {
  loadHerbs();
}
