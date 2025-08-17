import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 註冊
window.register = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("註冊成功！");
  } catch (err) {
    alert("註冊失敗：" + err.message);
  }
};

// 登入
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("登入成功！");
    window.location.href = "../index.html"; // ✅ 登入後轉跳
  } catch (err) {
    alert("登入失敗：" + err.message);
  }
};

// 登出
window.logout = async function () {
  await signOut(auth);
  alert("已登出！");
};

// 登入狀態變化監聽
onAuthStateChanged(auth, (user) => {
  const status = document.getElementById("loginStatus");
  if (status) {
    status.innerText = user ? `登入中：${user.email}` : "尚未登入";
  }

  // ✅ 如果目前已登入，且本頁是 login.html，就自動跳轉
  if (user && window.location.pathname.includes("login.html")) {
    window.location.href = "../index.html";
  }
});
