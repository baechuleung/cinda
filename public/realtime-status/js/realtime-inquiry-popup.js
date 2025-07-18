// 파일 경로: /public/realtime-status/js/realtime-inquiry-popup.js

import { db } from '/js/firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수로 각 카드의 광고 데이터 저장
const cardInquiryData = new Map();

// 추천한 업체 ID를 로컬 스토리지에 저장
const LIKED_STORES_KEY = 'cinda_liked_stores';

// 추천한 업체 목록 가져오기
function getLikedStores() {
    try {
        const liked = localStorage.getItem(LIKED_STORES_KEY);
        return liked ? JSON.parse(liked) : [];
    } catch (e) {
        return [];
    }
}

// 추천한 업체 추가
function addLikedStore(userId) {
    const liked = getLikedStores();
    if (!liked.includes(userId)) {
        liked.push(userId);
        localStorage.setItem(LIKED_STORES_KEY, JSON.stringify(liked));
    }
}

// 이미 추천했는지 확인
function hasLiked(userId) {
    return getLikedStores().includes(userId);
}

// 문의 팝업 기능 초기화
export async function initializeInquiryPopup() {
    console.log('문의 팝업 초기화 시작');
    
    // 1. 먼저 모든 status-card에 대해 광고 데이터 로드
    const statusCards = document.querySelectorAll('.status-card');
    console.log('찾은 카드 수:', statusCards.length);
    
    for (const card of statusCards) {
        // 카드에서 storeId 추출
        const storeId = card.querySelector('.action-btn.inquiry')?.dataset.storeId;
        
        if (storeId) {
            // storeId로 realtime-status 문서에서 storeCode 가져오기
            try {
                const storeDoc = await getDoc(doc(db, 'realtime-status', storeId));
                if (storeDoc.exists()) {
                    const storeData = storeDoc.data();
                    const storeCode = storeData.storeCode;
                    
                    if (storeCode) {
                        const ads = await loadInquiryData(storeCode);
                        if (ads && ads.length > 0) {
                            cardInquiryData.set(storeId, ads);
                        }
                    }
                }
            } catch (error) {
                console.error('가게 정보 로드 오류:', error);
            }
        }
    }
    
    // 2. 문의하기 버튼에 클릭 이벤트 추가
    const inquiryButtons = document.querySelectorAll('.action-btn.inquiry');
    inquiryButtons.forEach(btn => {
        btn.addEventListener('click', openInquiryPopup);
    });
}

// 문의 팝업 열기
function openInquiryPopup(e) {
    e.preventDefault();
    
    const storeId = this.dataset.storeId;
    const card = this.closest('.status-card');
    const location = card.querySelector('.location').textContent;
    const ads = cardInquiryData.get(storeId) || [];
    
    // 모바일/PC 분기
    if (window.innerWidth <= 768) {
        openMobileInquiry(card, location, this, ads);
    } else {
        openDesktopInquiry(card, location, this, ads);
    }
}

// 모바일 문의 팝업
function openMobileInquiry(card, location, button, ads) {
    // 이미 활성화된 버튼 클릭시 닫기
    if (button.classList.contains('active')) {
        closeAllMobilePopups();
        return;
    }
    
    // 기존 열린 팝업 닫기
    closeAllMobilePopups();
    
    // 활성화
    card.classList.add('active');
    button.classList.add('active');
    
    // 문의 영역 생성
    const area = document.createElement('div');
    area.className = 'mobile-action-area inquiry-list';
    
    if (ads.length > 0) {
        // 문의 가능한 업체가 있는 경우
        area.innerHTML = `
            <div class="mobile-action-container">
                <div class="inquiry-header">
                    <h3>문의 가능 업체</h3>
                    <span class="location-tag">${location}</span>
                    <button class="close-btn" onclick="closeAllMobilePopups()">×</button>
                </div>
                
                <div class="inquiry-list-container">
                    ${ads.map((ad, index) => `
                        <div class="inquiry-item" data-index="${index}">
                            <div class="inquiry-item-left">
                                <span class="business-name">${ad.businessName}</span>
                                <span class="badge">문의가능</span>
                            </div>
                            <div class="inquiry-item-right">
                                <button class="inquiry-phone-btn" data-phone="${ad.contactPhone || ''}" data-business="${ad.businessName}" data-nickname="${ad.userNickname}">
                                    📞
                                </button>
                                <button class="inquiry-like-btn" data-userid="${ad.userId}">
                                    ❤️ ${ad.recommendationOrder || 0}
                                </button>
                                <span class="user-nickname">${ad.userNickname}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        // 문의 가능한 업체가 없는 경우
        area.innerHTML = `
            <div class="mobile-action-container">
                <div class="inquiry-header">
                    <h3>문의하기</h3>
                    <span class="location-tag">${location}</span>
                    <button class="close-btn" onclick="closeAllMobilePopups()">×</button>
                </div>
                <div class="inquiry-empty-content">
                    <p class="empty-message">현재 문의 가능한 업체가 없습니다.</p>
                    <p class="empty-sub-message">실시간 현황판 광고를 신청한 업체의 연락처가 여기에 표시됩니다.</p>
                </div>
            </div>
        `;
    }
    
    // 선택된 카드 바로 다음에 삽입
    card.parentNode.insertBefore(area, card.nextSibling);
    
    // 각 버튼에 이벤트 추가 (문의 가능한 업체가 있는 경우)
    if (ads.length > 0) {
        // 전화 버튼 이벤트
        area.querySelectorAll('.inquiry-phone-btn').forEach(btn => {
            btn.addEventListener('click', handlePhoneClick);
        });
        
        // 좋아요 버튼 이벤트
        area.querySelectorAll('.inquiry-like-btn').forEach(btn => {
            btn.addEventListener('click', handleLikeClick);
        });
    }
}

// PC 문의 팝업
function openDesktopInquiry(card, location, button, ads) {
    const rightSection = document.querySelector('.right-section');
    const mainContainer = document.querySelector('.main-container');
    
    // 이미 활성화된 버튼 클릭시 닫기
    if (button.classList.contains('active')) {
        closeDesktopPopup();
        return;
    }
    
    // 기존 활성화 제거
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    // 활성화
    card.classList.add('active');
    button.classList.add('active');
    mainContainer.classList.add('right-active');
    
    if (ads.length > 0) {
        // 문의 가능한 업체가 있는 경우
        rightSection.innerHTML = `
            <div class="right-content">
                <div class="inquiry-header">
                    <h3>문의 가능 업체</h3>
                    <span class="location-tag">${location}</span>
                    <button class="close-btn" onclick="closeDesktopPopup()">×</button>
                </div>
                
                <div class="inquiry-list-container">
                    ${ads.map((ad, index) => `
                        <div class="inquiry-item" data-index="${index}">
                            <div class="inquiry-item-left">
                                <span class="business-name">${ad.businessName}</span>
                                <span class="badge">문의가능</span>
                            </div>
                            <div class="inquiry-item-right">
                                <button class="inquiry-phone-btn" data-phone="${ad.contactPhone || ''}" data-business="${ad.businessName}" data-nickname="${ad.userNickname}">
                                    📞
                                </button>
                                <button class="inquiry-like-btn" data-userid="${ad.userId}">
                                    ❤️ ${ad.recommendationOrder || 0}
                                </button>
                                <span class="user-nickname">${ad.userNickname}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        // 문의 가능한 업체가 없는 경우
        rightSection.innerHTML = `
            <div class="right-content">
                <div class="inquiry-header">
                    <h3>문의하기</h3>
                    <span class="location-tag">${location}</span>
                    <button class="close-btn" onclick="closeDesktopPopup()">×</button>
                </div>
                <div class="inquiry-empty-content">
                    <p class="empty-message">현재 문의 가능한 업체가 없습니다.</p>
                    <p class="empty-sub-message">실시간 현황판 광고를 신청한 업체의 연락처가 여기에 표시됩니다.</p>
                </div>
            </div>
        `;
    }
    
    rightSection.style.display = 'flex';
    
    // 각 버튼에 이벤트 추가 (문의 가능한 업체가 있는 경우)
    if (ads.length > 0) {
        // 전화 버튼 이벤트
        rightSection.querySelectorAll('.inquiry-phone-btn').forEach(btn => {
            btn.addEventListener('click', handlePhoneClick);
        });
        
        // 좋아요 버튼 이벤트
        rightSection.querySelectorAll('.inquiry-like-btn').forEach(btn => {
            btn.addEventListener('click', handleLikeClick);
        });
    }
}

// 전화 버튼 클릭 처리
function handlePhoneClick(e) {
    e.stopPropagation();
    
    const phone = this.dataset.phone;
    const businessName = this.dataset.business;
    const nickname = this.dataset.nickname;
    
    if (!phone) {
        alert('등록된 전화번호가 없습니다.');
        return;
    }
    
    const contactInfo = `${businessName}\n담당자: ${nickname}\n전화번호: ${phone}`;
    
    // 모바일에서는 전화 연결 옵션 제공
    if (window.innerWidth <= 768 && window.confirm(contactInfo + '\n\n전화로 연결하시겠습니까?')) {
        window.location.href = `tel:${phone}`;
    } else {
        alert(contactInfo);
    }
}

// 좋아요 버튼 클릭 처리
async function handleLikeClick(e) {
    e.stopPropagation();
    
    const userId = this.dataset.userid;
    const button = this;
    
    // 이미 추천한 경우
    if (hasLiked(userId)) {
        return;
    }
    
    try {
        // 버튼 비활성화
        button.disabled = true;
        
        // business_users 문서의 recommendationOrder 값 증가
        const userRef = doc(db, 'business_users', userId);
        await updateDoc(userRef, {
            recommendationOrder: increment(1)
        });
        
        // 현재 숫자 업데이트
        const currentCount = parseInt(button.textContent.match(/\d+/)[0] || 0);
        button.innerHTML = `❤️ ${currentCount + 1}`;
        
        // 추천 목록에 추가
        addLikedStore(userId);
        
        // 버튼 스타일 변경
        button.classList.add('liked');
        
        // 클릭 효과
        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
        
    } catch (error) {
        console.error('좋아요 처리 오류:', error);
        // 오류 발생 시 버튼 다시 활성화
        button.disabled = false;
    }
}

// 특정 storeCode에 대한 문의 데이터 로드
async function loadInquiryData(storeCode) {
    try {
        console.log('storeCode로 광고 데이터 로드:', storeCode);
        
        // 1. ad_requests_job에서 조건에 맞는 광고 조회
        const adsQuery = query(
            collection(db, 'ad_requests_job'),
            where('adType', '==', 'realtime')
        );
        
        const adsSnapshot = await getDocs(adsQuery);
        const pendingAds = [];
        
        console.log('전체 realtime 광고 수:', adsSnapshot.size);
        
        // 2. 각 광고에 대해 storeCode 확인 및 사용자 정보 가져오기
        for (const adDoc of adsSnapshot.docs) {
            const adData = adDoc.data();
            console.log('광고 데이터:', adData);
            
            // status가 pending 또는 active인 경우만 처리
            if (adData.status !== 'pending' && adData.status !== 'active') {
                continue;
            }
            
            // 광고의 storeCode가 일치하는지 확인
            let isMatch = false;
            
            if (adData.storeCode === storeCode) {
                isMatch = true;
                console.log('storeCode 일치:', adData.storeCode);
            } else {
                // business_users에서 storeCode 확인
                try {
                    const userDoc = await getDoc(doc(db, 'business_users', adData.userId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.storeCode === storeCode) {
                            isMatch = true;
                            console.log('사용자 storeCode 일치:', userData.storeCode);
                        }
                    }
                } catch (userError) {
                    console.error('사용자 정보 조회 오류:', userError);
                }
            }
            
            if (isMatch) {
                // business_users에서 추천순 정보 가져오기
                try {
                    const userDoc = await getDoc(doc(db, 'business_users', adData.userId));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        pendingAds.push({
                            id: adDoc.id,
                            ...adData,
                            recommendationOrder: userData.recommendationOrder || 0,
                            userNickname: adData.userNickname || userData.nickname || adData.contactName || '미등록',
                            businessName: adData.businessName || userData.storeName || ''
                        });
                    }
                } catch (userError) {
                    // 사용자 정보를 가져올 수 없는 경우에도 광고 데이터는 사용
                    console.log('사용자 정보 없이 광고 데이터 사용');
                    pendingAds.push({
                        id: adDoc.id,
                        ...adData,
                        recommendationOrder: 0,
                        userNickname: adData.userNickname || adData.contactName || '미등록',
                        businessName: adData.businessName || ''
                    });
                }
            }
        }
        
        console.log('매칭된 광고 수:', pendingAds.length);
        
        // 3. 추천순으로 정렬 (높은 순서대로)
        pendingAds.sort((a, b) => {
            return b.recommendationOrder - a.recommendationOrder;
        });
        
        return pendingAds;
        
    } catch (error) {
        console.error('문의 데이터 로드 오류:', error);
        console.error('오류 상세:', error.code, error.message);
        return [];
    }
}

// 모든 모바일 팝업 닫기
window.closeAllMobilePopups = function() {
    document.querySelectorAll('.mobile-action-area').forEach(area => area.remove());
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
}

// PC 팝업 닫기
window.closeDesktopPopup = function() {
    const rightSection = document.querySelector('.right-section');
    const mainContainer = document.querySelector('.main-container');
    
    rightSection.style.display = 'none';
    mainContainer.classList.remove('right-active');
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
}

// CSS 스타일은 별도의 realtime-inquiry.css 파일에 추가해야 함