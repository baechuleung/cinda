/* 파일 경로: public/auth/js/login.js */

import { auth } from '/js/firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 세션스토리지에서 로그인 필요 메시지 확인
    if (sessionStorage.getItem('loginRequired') === 'true') {
        alert('로그인이 필요한 서비스입니다.');
        sessionStorage.removeItem('loginRequired');
    }
});

// 로그인 폼 제출 처리
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorMessage = document.getElementById('error-message');
    
    // 이메일 조합
    const emailId = document.getElementById('email-id').value;
    const emailDomain = document.getElementById('email-domain').value;
    
    if (!emailId) {
        errorMessage.textContent = '아이디를 입력해주세요.';
        return;
    }
    
    const email = emailId + '@' + emailDomain;
    const password = document.getElementById('password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/realtime-status/html/realtime-status.html';
    } catch (error) {
        console.error('로그인 에러:', error);
        
        // 에러 메시지 표시
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage.textContent = '등록되지 않은 아이디입니다.';
                break;
            case 'auth/wrong-password':
                errorMessage.textContent = '비밀번호가 올바르지 않습니다.';
                break;
            case 'auth/invalid-email':
                errorMessage.textContent = '유효하지 않은 아이디 형식입니다.';
                break;
            default:
                errorMessage.textContent = '로그인에 실패했습니다.';
        }
    }
});