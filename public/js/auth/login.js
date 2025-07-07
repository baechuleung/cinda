import { auth } from '../firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '../../realtime-status/realtime-status.html';
    } catch (error) {
        errorMessage.textContent = '로그인에 실패했습니다.';
    }
});