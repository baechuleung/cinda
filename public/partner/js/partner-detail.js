// 파일경로: /partner/js/partner-detail.js
// 파일이름: partner-detail.js

import { auth, db, rtdb } from '/js/firebase-config.js';
import { ref as rtdbRef, get, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { recordClick, toggleFavorite, checkIfFavorited, watchFavoriteStatus, toggleRecommend, checkIfRecommended, watchRecommendStatus, getStatistics } from './partner-interactions.js';

let partnerData = null;

// URL 파라미터에서 정보 가져오기
const urlParams = new URLSearchParams(window.location.search);
const partnerId = urlParams.get('id');
const userId = urlParams.get('userId');

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', async function() {
    if (!partnerId || !userId) {
        alert('제휴서비스를 찾을 수 없습니다.');
        window.location.href = 'partner-list.html';
        return;
    }
    
    // 먼저 제휴서비스를 로드
    await loadPartnerDetail();
    setupEventListeners();
    
    // 인증 상태 확인 후 클릭 기록
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('사용자 인증됨, 클릭 기록 시도');
            await recordClick(partnerId, userId);
        } else {
            console.log('로그인하지 않은 사용자');
        }
    });
});

// 제휴서비스 상세 로드
async function loadPartnerDetail() {
    try {
        // Realtime Database에서 제휴서비스 가져오기
        const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
        const snapshot = await get(partnerRef);
        
        if (!snapshot.exists()) {
            alert('제휴서비스를 찾을 수 없습니다.');
            window.location.href = 'partner-list.html';
            return;
        }
        
        const data = snapshot.val();
        
        // userId가 일치하는지 확인
        if (data.userId !== userId) {
            alert('잘못된 접근입니다.');
            window.location.href = 'partner-list.html';
            return;
        }
        
        partnerData = {
            id: partnerId,
            ...data
        };
        
        console.log('제휴서비스 데이터:', partnerData);
        
        // 화면에 표시
        displayPartnerDetail();
        
    } catch (error) {
        console.error('제휴서비스 로드 오류:', error);
        alert('제휴서비스를 불러오는데 실패했습니다.');
        window.location.href = 'partner-list.html';
    }
}

// 제휴서비스 상세 표시
function displayPartnerDetail() {
    // 업체 이미지
    const businessImageDiv = document.getElementById('businessImage');
    if (partnerData.businessImageUrl) {
        const img = document.createElement('img');
        img.src = partnerData.businessImageUrl;
        img.alt = partnerData.businessName;
        businessImageDiv.appendChild(img);
    } else {
        businessImageDiv.textContent = '🏢';
    }
    
    // 업체 정보 섹션 (리스트와 동일한 구조)
    // 첫 번째 줄: 업체명, 지역
    document.getElementById('businessNameTop').textContent = partnerData.businessName || '업체명';
    
    const regionText = partnerData.region1 && partnerData.region2 ?
        `${partnerData.region1}/${partnerData.region2}` : (partnerData.region1 || partnerData.region2 || '지역정보없음');
    document.getElementById('regionTag').textContent = regionText;
    
    // 두 번째 줄: 할인 정보
    document.getElementById('discountAmount').textContent = partnerData.promotionTitle || '프로모션 정보 없음';
    
    // 세 번째 줄: 업종
    document.getElementById('businessType').textContent = partnerData.businessType || '업종';
    
    // 제휴 업체 정보 섹션
    // 주소
    const businessAddress = document.getElementById('businessAddress');
    businessAddress.textContent = partnerData.businessAddress || '주소 정보가 없습니다.';
    
    // 영업시간
    const businessHoursList = document.getElementById('businessHoursList');
    businessHoursList.innerHTML = '';
    
    if (partnerData.businessHours) {
        const item = document.createElement('div');
        item.className = 'business-hours-item';
        item.textContent = partnerData.businessHours;
        businessHoursList.appendChild(item);
    } else {
        businessHoursList.innerHTML = '<div class="business-hours-item">영업시간 정보가 없습니다.</div>';
    }
    
    // 프로모션 내용
    const detailContent = document.getElementById('detailContent');
    detailContent.textContent = partnerData.adDetailContent || '프로모션 내용이 없습니다.';
    
    // 상세 이미지
    if (partnerData.detailImageUrl) {
        document.getElementById('detailImageContainer').style.display = 'block';
        document.getElementById('detailImage').src = partnerData.detailImageUrl;
    }
    
    // 아이콘 버튼 이벤트 추가
    addIconButtons();
    
    // 하단 연락처 버튼 설정
    setupContactButtons();
}

// 아이콘 버튼 이벤트 추가
function addIconButtons() {
    // 추천 버튼 이벤트
    const recommendBtn = document.getElementById('recommendBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    // 초기 상태 확인
    checkIfRecommended(partnerId, userId).then(isRecommended => {
        updateRecommendIcon(isRecommended);
    });
    
    checkIfFavorited(partnerId, userId).then(isFavorited => {
        updateFavoriteIcon(isFavorited);
    });
    
    // 추천 버튼 클릭 이벤트
    recommendBtn.addEventListener('click', async () => {
        const isRecommended = await toggleRecommend(partnerId, userId);
        updateRecommendIcon(isRecommended);
    });
    
    // 찜 버튼 클릭 이벤트
    favoriteBtn.addEventListener('click', async () => {
        const isFavorited = await toggleFavorite(partnerId, userId);
        updateFavoriteIcon(isFavorited);
    });
    
    // 공유 버튼 클릭 이벤트
    shareBtn.addEventListener('click', async () => {
        const shareUrl = `${window.location.origin}/partner/partner-detail.html?id=${partnerId}&userId=${userId}`;
        
        try {
            await navigator.clipboard.writeText(shareUrl);
            
            // 복사 완료 알림
            showCopyAlert('링크가 복사되었습니다!');
        } catch (err) {
            console.error('복사 실패:', err);
            alert('링크 복사에 실패했습니다.');
        }
    });
    
    // 상태 실시간 감시
    watchRecommendStatus(partnerId, userId, (isRecommended) => {
        updateRecommendIcon(isRecommended);
    });
    
    watchFavoriteStatus(partnerId, userId, (isFavorited) => {
        updateFavoriteIcon(isFavorited);
    });
}

// 하단 연락처 버튼 설정
function setupContactButtons() {
    // 카카오톡 버튼
    if (partnerData.social && partnerData.social.kakao) {
        const kakaoBtn = document.getElementById('kakaoBtn');
        kakaoBtn.style.display = 'flex';
        
        kakaoBtn.addEventListener('click', function() {
            const kakaoValue = partnerData.social.kakao;
            
            // URL인지 확인
            if (kakaoValue.startsWith('http://') || kakaoValue.startsWith('https://')) {
                window.open(kakaoValue, '_blank');
            } else {
                // 텍스트인 경우 클립보드에 복사
                navigator.clipboard.writeText(kakaoValue).then(function() {
                    showCopyAlert('카카오톡 ID가 복사되었습니다.\n카카오톡에서 친구를 찾아보세요.');
                }).catch(function(err) {
                    console.error('복사 실패:', err);
                    alert('복사에 실패했습니다.');
                });
            }
        });
    }
    
    // 텔레그램 버튼
    if (partnerData.social && partnerData.social.telegram) {
        const telegramBtn = document.getElementById('telegramBtn');
        telegramBtn.style.display = 'flex';
        
        telegramBtn.addEventListener('click', function() {
            const telegramValue = partnerData.social.telegram;
            
            // URL인지 확인
            if (telegramValue.startsWith('http://') || telegramValue.startsWith('https://')) {
                window.open(telegramValue, '_blank');
            } else {
                // 텍스트인 경우 클립보드에 복사
                navigator.clipboard.writeText(telegramValue).then(function() {
                    showCopyAlert('텔레그램 ID가 복사되었습니다.\n텔레그램에서 찾아보세요.');
                }).catch(function(err) {
                    console.error('복사 실패:', err);
                    alert('복사에 실패했습니다.');
                });
            }
        });
    }
    
    // 전화 버튼
    const phoneBtn = document.getElementById('phoneBtn');
    phoneBtn.addEventListener('click', function() {
        if (partnerData.contactPhone) {
            window.location.href = `tel:${partnerData.contactPhone}`;
        } else {
            alert('연락처 정보가 없습니다.');
        }
    });
}

// 아이콘 업데이트 함수
function updateRecommendIcon(isRecommended) {
    const btn = document.getElementById('recommendBtn');
    if (isRecommended) {
        btn.classList.add('recommended');
    } else {
        btn.classList.remove('recommended');
    }
}

function updateFavoriteIcon(isFavorited) {
    const btn = document.getElementById('favoriteBtn');
    if (isFavorited) {
        btn.classList.add('favorited');
    } else {
        btn.classList.remove('favorited');
    }
}

// 복사 알림 표시
function showCopyAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        text-align: center;
        min-width: 200px;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 2000);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 추가적인 이벤트 리스너가 필요한 경우 여기에 추가
}