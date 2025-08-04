// 파일 경로: /admin/js/index.js
// 파일 이름: index.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // 로그인하지 않은 경우
        window.location.replace('/admin/login.html');
        return;
    }
    
    try {
        // 관리자 권한 확인
        const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
        if (!adminDoc.exists()) {
            // 관리자 권한이 없는 경우
            await auth.signOut();
            window.location.replace('/admin/login.html');
            return;
        }
        
        // 관리자 권한이 있는 경우 대시보드로 이동
        window.location.replace('/admin/dashboard.html');
        
    } catch (error) {
        console.error('권한 확인 오류:', error);
        window.location.replace('/admin/login.html');
    }
});