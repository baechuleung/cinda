import { auth } from '../../js/firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('error-message');
    
    if (password !== confirmPassword) {
        errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
        return;
    }
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        window.location.href = '../../dashboard.html';
    } catch (error) {
        errorMessage.textContent = '회원가입에 실패했습니다.';
    }
});