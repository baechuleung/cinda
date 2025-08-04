// 파일경로: /ad-business/js/ad-list.js
// 파일이름: ad-list.js

import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref as rtdbRef, get, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let currentUser = null;
let allAds = [];

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
    
    // 공고 목록 로드
    loadAdList();
    
    // 상태 필터 버튼 이벤트 설정
    initializeStatusFilter();
});

// 상태 필터 버튼 초기화
function initializeStatusFilter() {
    const filterButtons = document.querySelectorAll('.status-filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 모든 버튼에서 active 클래스 제거
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // 클릭한 버튼에 active 클래스 추가
            this.classList.add('active');
            
            // 필터 적용
            const selectedStatus = this.dataset.status;
            filterAdsByStatus(selectedStatus);
        });
    });
}

// 상태별 필터링
function filterAdsByStatus(selectedStatus) {
    if (selectedStatus === '') {
        displayAds(allAds);
    } else {
        const filteredAds = allAds.filter(ad => {
            let status = ad.status;
            if (status === 'active') {
                const endDate = new Date(ad.startDate);
                endDate.setMonth(endDate.getMonth() + ad.duration);
                if (endDate < new Date()) {
                    status = 'expired';
                }
            }
            return status === selectedStatus;
        });
        displayAds(filteredAds);
    }
}

// 공고 목록 로드
async function loadAdList() {
    try {
        const adList = document.getElementById('adList');
        adList.innerHTML = '<div style="text-align: center; padding: 20px;">로딩중...</div>';
        
        console.log('현재 사용자:', currentUser.uid);
        
        // Realtime Database에서 모든 공고 목록 가져오기
        const adRef = rtdbRef(rtdb, 'ad_business');
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            allAds = [];
            displayAds(allAds);
            return;
        }
        
        allAds = [];
        const adsData = snapshot.val();
        
        // 현재 사용자의 공고만 필터링
        Object.keys(adsData).forEach(key => {
            if (adsData[key].userId === currentUser.uid) {
                allAds.push({
                    id: key,
                    ...adsData[key]
                });
            }
        });
        
        // 생성일 기준으로 정렬 (최신순)
        allAds.sort((a, b) => {
            const aTime = a.createdAt || 0;
            const bTime = b.createdAt || 0;
            return bTime - aTime;
        });
        
        console.log('최종 광고 목록:', allAds);
        displayAds(allAds);
        
    } catch (error) {
        console.error('공고 목록 로드 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        
        // 더 자세한 오류 정보 표시
        document.getElementById('adList').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ff0000;">
                공고 목록을 불러오는데 실패했습니다.<br>
                오류: ${error.message}<br>
                <small>개발자 도구 콘솔을 확인해주세요.</small>
            </div>
        `;
    }
}

// 공고 목록 표시
function displayAds(ads) {
    const adList = document.getElementById('adList');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (ads.length === 0) {
        adList.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    adList.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    // 기존 카드들 제거
    adList.innerHTML = '';
    
    ads.forEach(ad => {
        // 카드 요소 생성
        const cardElement = document.createElement('div');
        cardElement.className = 'ad-card';
        
        // 카드 내용 생성
        const cardContent = document.createElement('div');
        cardContent.className = 'ad-card-content';
        
        // 이미지 영역
        const imageDiv = document.createElement('div');
        imageDiv.className = 'ad-image';
        
        if (ad.businessImageUrl) {
            const img = document.createElement('img');
            img.src = ad.businessImageUrl;
            img.alt = ad.businessName || '';
            imageDiv.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'ad-placeholder';
            placeholder.textContent = '이미지';
            imageDiv.appendChild(placeholder);
        }
        
        // 정보 영역
        const infoDiv = document.createElement('div');
        infoDiv.className = 'ad-info';
        
        // 담당자명 + 지역 (같은 줄)
        const contactLocationDiv = document.createElement('div');
        contactLocationDiv.className = 'ad-contact-location';
        
        const contactNameSpan = document.createElement('span');
        contactNameSpan.className = 'ad-contact-name';
        contactNameSpan.textContent = ad.contactName || '';
        
        const locationSpan = document.createElement('span');
        locationSpan.className = 'ad-location';
        locationSpan.textContent = `${ad.region1 || ''}/${ad.region2 || ''}`;
        
        contactLocationDiv.appendChild(contactNameSpan);
        contactLocationDiv.appendChild(locationSpan);
        
        // 제목
        const titleH3 = document.createElement('h3');
        titleH3.className = 'ad-title';
        titleH3.textContent = `${ad.businessName} - ${ad.businessType || '업종미지정'}`;
        
        // 가격
        const priceDiv = document.createElement('div');
        priceDiv.className = 'ad-price';
        priceDiv.innerHTML = `<span class="salary-type">${ad.salaryType || '시급'}</span> ${formatPrice(ad.salary || 0)}원`;
        
        // 정보 영역에 추가
        infoDiv.appendChild(contactLocationDiv);
        infoDiv.appendChild(titleH3);
        infoDiv.appendChild(priceDiv);
        
        // 액션 영역
        const actionDiv = document.createElement('div');
        actionDiv.className = 'ad-action';
        
        const actionBtn = document.createElement('button');
        actionBtn.className = 'action-btn';
        
        const status = ad.status || 'pending';
        if (status === 'active') {
            actionBtn.textContent = '광고중';
            actionBtn.classList.add('active');
        } else if (status === 'pending') {
            actionBtn.textContent = '승인대기';
            actionBtn.classList.add('pending');
        } else if (status === 'rejected') {
            actionBtn.textContent = '반려';
            actionBtn.classList.add('rejected');
        } else {
            actionBtn.textContent = '광고종료';
            actionBtn.classList.add('inactive');
        }
        
        actionDiv.appendChild(actionBtn);
        
        // 카드 조립
        cardContent.appendChild(imageDiv);
        cardContent.appendChild(infoDiv);
        cardElement.appendChild(cardContent);
        cardElement.appendChild(actionDiv);
        
        // 카드 클릭 이벤트 추가
        cardElement.addEventListener('click', function(e) {
            // 액션 버튼 클릭시에는 상세페이지로 이동하지 않음
            if (!e.target.closest('.ad-action')) {
                window.location.href = `ad-detail.html?id=${ad.id}`;
            }
        });
        
        // 카드에 커서 포인터 스타일 추가
        cardElement.style.cursor = 'pointer';
        
        // 목록에 추가
        adList.appendChild(cardElement);
    });
}

// 상태 텍스트 변환
function getStatusText(status) {
    const statusMap = {
        'active': '진행중',
        'pending': '승인대기',
        'expired': '만료',
        'rejected': '반려',
        'approved': '승인'
    };
    return statusMap[status] || status;
}

// 타임스탬프 포맷
function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
}

// 가격 포맷팅
function formatPrice(price) {
    if (!price) return 0;
    return parseInt(price).toLocaleString();
}

// 상세보기
window.viewDetails = function(id) {
    const ad = allAds.find(a => a.id === id);
    if (!ad) return;
    
    let details = `
공고 상세 정보
================
업체명: ${ad.businessName}
공고 제목: ${ad.adTitle}
공고 내용: ${ad.adContent}
공고 유형: ${ad.adType === 'banner' ? '배너 공고' : ad.adType}
상태: ${getStatusText(ad.status)}
시작일: ${ad.startDate}
기간: ${ad.duration}개월
`;

    alert(details);
}

// 통계보기
window.viewStats = function(id) {
    alert('통계 기능은 준비중입니다.');
}

// 공고 취소
window.cancelAd = async function(id) {
    if (!confirm('정말로 공고를 취소하시겠습니까?\n취소 후에는 복구할 수 없습니다.')) {
        return;
    }
    
    try {
        // Realtime Database에서 삭제
        const adRef = rtdbRef(rtdb, `ad_business/${id}`);
        await remove(adRef);
        
        alert('공고가 취소되었습니다.');
        loadAdList();
        
    } catch (error) {
        console.error('공고 취소 오류:', error);
        alert('공고 취소 중 오류가 발생했습니다.');
    }
}

// 재신청
window.reapplyAd = function(id) {
    if (confirm('동일한 내용으로 공고를 재신청하시겠습니까?')) {
        const ad = allAds.find(a => a.id === id);
        if (ad) {
            sessionStorage.setItem('reapplyAdData', JSON.stringify(ad));
        }
        window.location.href = 'ad-form.html';
    }
}

// 페이지 로드시 공고 목록 표시
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료');
});