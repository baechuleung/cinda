// 파일경로: mypage/js/mypage.js
// 파일이름: mypage.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 사용자 정보 표시
async function displayUserInfo(user) {
    if (!user) return;
    
    try {
        // Firestore에서 사용자 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData) {
            // 닉네임 표시
            const profileName = document.querySelector('.profile-name');
            if (profileName) {
                profileName.textContent = userData.nickname || '사용자';
            }
            
            // 회원 상태 표시
            const profileStatus = document.querySelector('.profile-status');
            if (profileStatus && userData.memberType) {
                profileStatus.textContent = userData.memberType;
            }
        }
    } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
    }
}

// 페이지 초기화
function initializePage() {
    // 즐겨찾기 링크
    const favoriteLink = document.querySelector('.activity-list .activity-link');
    if (favoriteLink) {
        favoriteLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('즐겨찾기 기능은 준비중입니다.');
        });
    }
    
    // 찜 링크
    const wishlistLink = document.querySelectorAll('.activity-list .activity-link')[1];
    if (wishlistLink) {
        wishlistLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('찜 기능은 준비중입니다.');
        });
    }
    
    // 회원정보 수정 링크
    const editLink = document.querySelector('.account-list .account-link');
    if (editLink) {
        editLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('회원정보 수정 기능은 준비중입니다.');
        });
    }
    
    // 회원탈퇴 링크
    const withdrawLink = document.querySelector('.member-list .member-link');
    if (withdrawLink) {
        withdrawLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('정말로 회원을 탈퇴하시겠습니까?')) {
                alert('회원탈퇴 기능은 준비중입니다.');
            }
        });
    }
}

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
    if (user) {
        displayUserInfo(user);
        initializePage();
    } else {
        // 로그인하지 않은 경우 로그인 페이지로 이동
        alert('로그인이 필요합니다.');
        window.location.href = '/login/login.html';
    }
});