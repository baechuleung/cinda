// 파일 경로: /public/advertise/js/ad-add.js
// 파일 이름: ad-add.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initGeneralAdForm, submitGeneralAdForm } from '/advertise/js/ad-form-general.js';
import { initJobAdForm, submitJobAdForm } from '/advertise/js/ad-form-job.js';

let currentUser = null;
let businessData = null;

// DOM이 로드될 때까지 대기
document.addEventListener('DOMContentLoaded', function() {
    // 인증 상태 확인
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
            return;
        }
        
        currentUser = user;
        
        // users 컬렉션에서 사용자 정보 확인
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                businessData = userData;
                
                // 바로 폼 로드
                loadAdForm(userData.userType);
            } else {
                alert('사용자 정보를 찾을 수 없습니다.');
                window.location.href = '/index.html';
                return;
            }
        } catch (error) {
            console.error('사용자 정보 확인 중 오류:', error);
            alert('사용자 정보 확인 중 오류가 발생했습니다.');
            window.location.href = '/index.html';
        }
    });
});

// 광고 폼 로드 함수
async function loadAdForm(userType) {
    const formContainer = document.getElementById('ad-form-container');
    if (!formContainer) return;
    
    try {
        let formHtml;
        
        if (userType === 'partner') {
            // 파트너회원 - 일반 광고 폼
            const response = await fetch('/advertise/ad-form-general.html');
            formHtml = await response.text();
            formContainer.innerHTML = formHtml;
            
            // 폼 초기화
            initGeneralAdForm(businessData);
            
            // 폼 제출 설정
            submitGeneralAdForm(currentUser);
            
        } else if (userType === 'business') {
            // 업소회원 - 채용관 광고 폼
            const response = await fetch('/advertise/ad-form-job.html');
            formHtml = await response.text();
            formContainer.innerHTML = formHtml;
            
            // 폼 초기화
            initJobAdForm(businessData);
            
            // 폼 제출 설정
            submitJobAdForm(currentUser);
        } else {
            formContainer.innerHTML = '<div class="no-data">기업회원만 이용할 수 있습니다.</div>';
        }
    } catch (error) {
        console.error('폼 로드 오류:', error);
        formContainer.innerHTML = '<div class="no-data">신청서 로드 중 오류가 발생했습니다.</div>';
    }
}