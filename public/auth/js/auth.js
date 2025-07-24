import { auth } from '../../js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        // 로그인된 상태
        window.location.href = '/main/main.html';
    } else {
        // 로그인되지 않은 상태
        window.location.href = '/auth/login.html';
    }
});