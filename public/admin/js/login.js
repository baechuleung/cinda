// 파일 경로: /admin/js/login.js
// 파일 이름: login.js

import { auth, db } from '/js/firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        // Firebase Auth로 로그인
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // admin_users 컬렉션에서 uid 필드로 검색
        const q = query(collection(db, 'admin_users'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            errorMessage.textContent = '관리자 권한이 없습니다.';
            errorMessage.style.display = 'block';
            await auth.signOut();
            return;
        }
        
        // 로그인 성공
        window.location.href = '/admin/dashboard.html';
        
    } catch (error) {
        console.error('로그인 오류:', error);
        errorMessage.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
        errorMessage.style.display = 'block';
    }
});