// 파일 경로: /public/advertise/js/ad-add.js
// 파일 이름: ad-add.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initGeneralAdForm, updateGeneralAdAmount, submitGeneralAdForm } from '/advertise/js/ad-form-general.js';
import { initJobAdForm, updateJobAdAmount, submitJobAdForm } from '/advertise/js/ad-form-job.js';

let currentUser = null;
let businessData = null;
let userType = null; // 'partner' or 'business'

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
                businessData = userData; // users 컬렉션의 데이터를 businessData로 사용
                
                // userType이 partner 또는 business인지 확인
                if (userData.userType === 'partner') {
                    userType = 'partner';
                    console.log('파트너회원 확인됨');
                } else if (userData.userType === 'business') {
                    userType = 'business';
                    console.log('업소회원 확인됨');
                } else {
                    // partner나 business가 아닌 경우
                    alert('기업회원만 이용할 수 있습니다.');
                    window.location.href = '/index.html';
                    return;
                }
            } else {
                alert('사용자 정보를 찾을 수 없습니다.');
                window.location.href = '/index.html';
                return;
            }
        } catch (error) {
            console.error('사용자 정보 확인 중 오류:', error);
            alert('사용자 정보 확인 중 오류가 발생했습니다.');
            window.location.href = '/index.html';
            return;
        }
        
        // URL 파라미터에서 광고 정보 확인
        const urlParams = new URLSearchParams(window.location.search);
        const adType = urlParams.get('type');
        const adName = urlParams.get('name');
        const adPrice = urlParams.get('price');
        const adCategory = urlParams.get('category');
        
        if (adType && adName && adPrice && adCategory) {
            // 광고 정보 설정
            const selectedAdType = {
                type: adType,
                name: decodeURIComponent(adName),
                price: parseInt(adPrice)
            };
            
            // 해당 폼 로드
            loadAdForm(adType, selectedAdType, adCategory);
        } else {
            // 광고 정보가 없거나 잘못된 경우
            document.getElementById('ad-form-container').innerHTML = 
                '<div class="no-data">광고 정보가 올바르지 않습니다.</div>';
        }
    });
});

// 광고 폼 로드 함수
async function loadAdForm(type, selectedAdType, selectedAdCategory) {
    const formContainer = document.getElementById('ad-form-container');
    if (!formContainer) return;
    
    formContainer.innerHTML = ''; // 기존 폼 제거
    
    try {
        let formHtml;
        if (selectedAdCategory === 'general') {
            // 일반 광고 폼 로드
            const response = await fetch('/advertise/html/ad-form-general.html');
            formHtml = await response.text();
            formContainer.innerHTML = formHtml;
            
            // 폼 초기화
            initGeneralAdForm(businessData, selectedAdType, selectedAdType.price);
            
            // 이벤트 리스너 설정
            document.getElementById('duration1')?.addEventListener('change', () => {
                updateGeneralAdAmount(selectedAdType.price);
            });
            
            // 폼 제출 설정
            submitGeneralAdForm(currentUser, selectedAdType, selectedAdType.price);
            
        } else {
            // 채용관 광고 폼 로드
            const response = await fetch('/advertise/html/ad-form-job.html');
            formHtml = await response.text();
            formContainer.innerHTML = formHtml;
            
            // 폼 초기화
            initJobAdForm(businessData, selectedAdType, selectedAdType.price);
            
            // 이벤트 리스너 설정
            document.getElementById('duration2')?.addEventListener('change', () => {
                updateJobAdAmount(selectedAdType.price);
            });
            
            // 폼 제출 설정
            submitJobAdForm(currentUser, selectedAdType, selectedAdType.price);
        }
    } catch (error) {
        console.error('폼 로드 오류:', error);
        alert('신청서 로드 중 오류가 발생했습니다.');
    }
}

// 전역 함수로 금액 업데이트 함수 노출 - 제거됨