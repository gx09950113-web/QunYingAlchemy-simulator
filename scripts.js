const herbListDiv = document.getElementById('herbList');

async function loadHerbs() {
  const snapshot = await db.collection("herbs").get();
  snapshot.forEach(doc => {
    const herb = doc.data();
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${herb.name}" class="herb-select"> ${herb.name}<br>`;
    herbListDiv.appendChild(label);
  });
}

function simulateAlchemy() {
  const selectedHerbs = Array.from(document.querySelectorAll('.herb-select:checked')).map(el => el.value);
  const fireType = document.getElementById("fireType").value;

  if (selectedHerbs.length === 0) {
    document.getElementById("result").innerText = "請選擇至少一味藥材。";
    return;
  }

  // 🔥 播放燃燒音效
  const fireAudio = document.getElementById("fireSound");
  fireAudio.currentTime = 0;
  fireAudio.play();
  
  let resultText = `你使用了「${selectedHerbs.join('、')}」，以「${fireType}」製藥……\n`;
  const successRate = Math.floor(Math.random() * (99 - 30 + 1)) + 30;

  if (successRate > 50) {
    resultText += `✅ 成功！你煉出了一鍋看起來很不錯的丹藥！（成功率 ${successRate}%）`;
  } else {
    resultText += `❌ 煉丹失敗，藥材燒焦了……（成功率 ${successRate}%）`;
  }

  document.getElementById("result").innerText = resultText;
}

loadHerbs();


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

