// 파일 경로: /admin/js/header.js
// 파일 이름: header.js

import { auth } from '/js/firebase-config.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 로그아웃 버튼 이벤트
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '/admin/login.html';
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
});

// 현재 페이지에 따라 메뉴 활성화
const currentPath = window.location.pathname;
if (currentPath.includes('job-manage')) {
    document.getElementById('job-menu').classList.add('active');
} else if (currentPath.includes('partner-manage')) {
    document.getElementById('partner-menu').classList.add('active');
} else if (currentPath.includes('user-manage')) {
    document.getElementById('user-menu').classList.add('active');
} else if (currentPath.includes('post-manage')) {
    document.getElementById('post-menu').classList.add('active');
} else if (currentPath.includes('dashboard')) {
    // 대시보드에서는 활성화 표시 없음
}