import { auth } from '../firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 페이지 로드 시 로그인 필요 메시지 확인
document.addEventListener('DOMContentLoaded', function() {
    // 세션스토리지에서 로그인 필요 메시지 확인
    if (sessionStorage.getItem('loginRequired') === 'true') {
        alert('로그인이 필요한 서비스입니다.');
        // 메시지 표시 후 세션스토리지에서 제거
        sessionStorage.removeItem('loginRequired');
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/realtime-status/realtime-status.html';
    } catch (error) {
        errorMessage.textContent = '로그인에 실패했습니다.';
    }
});