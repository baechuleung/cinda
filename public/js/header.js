// 헤더 관리 스크립트
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 사용자 인증 상태 확인 및 관리자 메뉴 표시
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 관리자 여부 확인
            const isAdmin = await checkAdminStatus(user.uid);
            
            if (isAdmin) {
                showAdminMenu();
            }
        }
    });
});

// 관리자 상태 확인
async function checkAdminStatus(uid) {
    try {
        const adminDoc = await getDoc(doc(db, 'admin_users', uid));
        
        if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            // 레벨 10인 경우만 관리자 메뉴 표시
            return adminData.level === 10;
        }
        
        return false;
    } catch (error) {
        console.error('관리자 확인 오류:', error);
        return false;
    }
}

// 관리자 메뉴 표시
function showAdminMenu() {
    // 모든 .admin-menu 찾기 (header가 여러 번 로드될 수 있으므로)
    const adminMenus = document.querySelectorAll('.admin-menu');
    adminMenus.forEach(menu => {
        menu.style.display = 'block';
    });
}