// 파일경로: /ad-business/js/ad-detail.js
// 파일이름: ad-detail.js

import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref as rtdbRef, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let currentUser = null;
let adData = null;

// URL 파라미터에서 공고 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
const adId = urlParams.get('id');

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요합니다.');
        window.location.href = '/auth/login.html';
        return;
    }
    
    currentUser = user;
    
    // users 컬렉션에서 userType 확인
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().userType !== 'business') {
        alert('기업회원만 이용할 수 있습니다.');
        window.location.href = '/index.html';
        return;
    }
    
    if (!adId) {
        alert('공고 정보를 찾을 수 없습니다.');
        window.location.href = 'ad-list.html';
        return;
    }
    
    // 공고 상세 정보 로드
    loadAdDetail();
});

// 공고 상세 정보 로드
async function loadAdDetail() {
    try {
        console.log('공고 ID:', adId);
        
        // Realtime Database에서 공고 정보 가져오기
        const adRef = rtdbRef(rtdb, `users/${currentUser.uid}/ad_business/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            alert('공고 정보를 찾을 수 없습니다.');
            window.location.href = 'ad-list.html';
            return;
        }
        
        adData = {
            id: adId,
            ...snapshot.val()
        };
        
        console.log('공고 데이터:', adData);
        
        // 화면에 표시
        displayAdDetail();
        displayStats();
        
    } catch (error) {
        console.error('공고 상세 정보 로드 오류:', error);
        alert('공고 정보를 불러오는데 실패했습니다.');
        window.location.href = 'ad-list.html';
    }
}

// 공고 상세 정보 표시
function displayAdDetail() {
    const adDetailCard = document.getElementById('adDetailCard');
    
    // 이미지 영역
    const imageDiv = document.createElement('div');
    imageDiv.className = 'ad-detail-image';
    
    if (adData.businessImageUrl) {
        const img = document.createElement('img');
        img.src = adData.businessImageUrl;
        img.alt = adData.businessName || '';
        imageDiv.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'ad-detail-placeholder';
        placeholder.textContent = '이미지';
        imageDiv.appendChild(placeholder);
    }
    
    // 정보 영역
    const infoDiv = document.createElement('div');
    infoDiv.className = 'ad-detail-info';
    
    // 헤더 (담당자명 + 지역)
    const headerDiv = document.createElement('div');
    headerDiv.className = 'ad-detail-header';
    
    const contactSpan = document.createElement('span');
    contactSpan.className = 'ad-detail-contact';
    contactSpan.textContent = adData.contactName || '';
    
    const locationSpan = document.createElement('span');
    locationSpan.className = 'ad-detail-location';
    locationSpan.textContent = `${adData.region1 || ''}${adData.region2 ? '/' + adData.region2 : ''}`;
    
    headerDiv.appendChild(contactSpan);
    headerDiv.appendChild(locationSpan);
    
    // 제목
    const titleDiv = document.createElement('div');
    titleDiv.className = 'ad-detail-title';
    titleDiv.textContent = `${adData.businessName || ''} - ${adData.businessType || ''}`;
    
    // 급여
    const salaryDiv = document.createElement('div');
    salaryDiv.className = 'ad-detail-salary';
    salaryDiv.textContent = `${adData.salaryType || '시급'} ${formatPrice(adData.salary || 0)}원`;
    
    // 정보 영역에 추가
    infoDiv.appendChild(headerDiv);
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(salaryDiv);
    
    // 카드에 추가
    adDetailCard.appendChild(imageDiv);
    adDetailCard.appendChild(infoDiv);
}

// 통계 정보 표시
function displayStats() {
    // 추천수
    const recommendCount = adData.statistics?.recommend?.count || 0;
    document.getElementById('recommendCount').textContent = `${recommendCount.toLocaleString()} 회`;
    
    // 클릭수
    const clickCount = adData.statistics?.click?.count || 0;
    document.getElementById('clickCount').textContent = `${clickCount.toLocaleString()} 회`;
    
    // 승인상태
    const statusText = getStatusText(adData.status || 'pending');
    document.getElementById('approvalStatus').textContent = statusText;
}

// 상태 텍스트 변환
function getStatusText(status) {
    const statusMap = {
        'active': '광고중',
        'pending': '승인대기',
        'expired': '만료',
        'rejected': '반려',
        'approved': '승인완료'
    };
    return statusMap[status] || status;
}

// 가격 포맷팅
function formatPrice(price) {
    if (!price) return 0;
    return parseInt(price).toLocaleString();
}

// 공고 연장하기 버튼 이벤트
document.getElementById('extendBtn').addEventListener('click', function() {
    if (adData.status !== 'active') {
        alert('진행중인 공고만 연장할 수 있습니다.');
        return;
    }
    
    if (confirm('공고를 연장하시겠습니까?\n\n연장 기간: 1개월\n추가 비용이 발생할 수 있습니다.')) {
        // 연장 기능 구현 (현재는 알림만)
        alert('공고 연장 기능은 준비중입니다.\n담당자가 연락드릴 예정입니다.');
    }
});

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('공고 상세 페이지 로드 완료');
});