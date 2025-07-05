import { auth } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        // 로그인된 상태
        window.location.href = 'dashboard.html';
    } else {
        // 로그인되지 않은 상태
        window.location.href = 'html/auth/login.html';
    }
});