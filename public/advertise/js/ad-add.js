import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initGeneralAdForm, updateGeneralAdAmount, submitGeneralAdForm } from '/advertise/js/ad-form-general.js';
import { initJobAdForm, updateJobAdAmount, submitJobAdForm } from '/advertise/js/ad-form-job.js';

let currentUser = null;
let selectedAdType = null;
let selectedAdCategory = null; // 'general' or 'job'
let businessData = null;

// 광고 유형별 가격 정보
const adPrices = {
    top: 500000,
    realtime: 600000,
    vip: 300000,
    premium: 150000,
    basic: 70000,
    inquiry: 400000,
    partnership: 150000
};

// 광고 유형별 이름
const adTypeNames = {
    top: '신다 홈페이지 TOP 광고',
    realtime: '신다 실시간 현황판',
    vip: 'VIP 채용관',
    premium: 'Premium 채용관',
    basic: 'Basic 채용관',
    inquiry: '신다 수다방 게시물 하단 광고',
    partnership: '신다샵 제휴서비스 입점'
};

// 광고 카테고리 분류
const adCategories = {
    top: 'general',
    inquiry: 'general',
    partnership: 'general',
    realtime: 'job',
    vip: 'job',
    premium: 'job',
    basic: 'job'
};

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요합니다.');
        window.location.href = '/auth/login.html';
        return;
    }
    
    currentUser = user;
    
    // 기업회원인지 확인
    const businessDoc = await getDoc(doc(db, 'business_users', user.uid));
    if (!businessDoc.exists()) {
        alert('기업회원만 이용할 수 있습니다.');
        window.location.href = '/index.html';
        return;
    }
    
    // 기업회원 정보 저장
    businessData = businessDoc.data();
});

// 광고 옵션 선택
window.selectOption = async function(type) {
    // 즉시 UI 업데이트
    // 기존 선택 해제
    document.querySelectorAll('.ad-option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 새로운 선택 - 즉시 적용
    const selectedCard = document.querySelector(`[data-type="${type}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    selectedAdType = {
        type: type,
        name: adTypeNames[type],
        price: adPrices[type]
    };
    selectedAdCategory = adCategories[type];
    
    // 해당 폼 로드 및 표시
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
            initGeneralAdForm(businessData, selectedAdType, adPrices[type]);
            
            // 이벤트 리스너 설정
            document.getElementById('duration1')?.addEventListener('change', () => {
                updateGeneralAdAmount(adPrices[type]);
            });
            
            // 폼 제출 설정
            submitGeneralAdForm(currentUser, selectedAdType, adPrices[type]);
            
        } else {
            // 채용관 광고 폼 로드
            const response = await fetch('/advertise/html/ad-form-job.html');
            formHtml = await response.text();
            formContainer.innerHTML = formHtml;
            
            // 폼 초기화
            initJobAdForm(businessData, selectedAdType, adPrices[type]);
            
            // 이벤트 리스너 설정
            document.getElementById('duration2')?.addEventListener('change', () => {
                updateJobAdAmount(adPrices[type]);
            });
            
            // 폼 제출 설정
            submitJobAdForm(currentUser, selectedAdType, adPrices[type]);
        }
    } catch (error) {
        console.error('폼 로드 오류:', error);
        alert('신청서 로드 중 오류가 발생했습니다.');
    }
};

// 전역 함수로 금액 업데이트 함수 노출
window.updateTotalAmount = function() {
    if (!selectedAdType) return;
    
    if (selectedAdCategory === 'general') {
        updateGeneralAdAmount(adPrices[selectedAdType.type]);
    } else {
        updateJobAdAmount(adPrices[selectedAdType.type]);
    }
};