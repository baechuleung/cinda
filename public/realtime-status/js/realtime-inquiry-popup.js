// 파일 경로: /public/realtime-status/js/realtime-inquiry-popup.js

import { db } from '/js/firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수로 각 카드의 광고 데이터 저장
const cardInquiryData = new Map();

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
                            <div class="inquiry-item-header">
                                <span class="business-name">${ad.businessName}</span>
                                <span class="badge">문의가능</span>
                            </div>
                            <div class="inquiry-item-info">
                                <span class="nickname">${ad.userNickname}</span>
                                <span class="contact">${ad.socialContact?.kakao || ad.contactPhone || '연락처 없음'}</span>
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
    
    // 각 아이템에 클릭 이벤트 추가 (문의 가능한 업체가 있는 경우)
    if (ads.length > 0) {
        area.querySelectorAll('.inquiry-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                handleInquiryItemClick(ads[index]);
            });
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
                            <div class="inquiry-item-header">
                                <span class="business-name">${ad.businessName}</span>
                                <span class="badge">문의가능</span>
                            </div>
                            <div class="inquiry-item-info">
                                <span class="nickname">${ad.userNickname}</span>
                                <span class="contact">${ad.socialContact?.kakao || ad.contactPhone || '연락처 없음'}</span>
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
    
    // 각 아이템에 클릭 이벤트 추가 (문의 가능한 업체가 있는 경우)
    if (ads.length > 0) {
        rightSection.querySelectorAll('.inquiry-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                handleInquiryItemClick(ads[index]);
            });
        });
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
                            recommendationOrder: userData.recommendationOrder || null,
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
                        recommendationOrder: null,
                        userNickname: adData.userNickname || adData.contactName || '미등록',
                        businessName: adData.businessName || ''
                    });
                }
            }
        }
        
        console.log('매칭된 광고 수:', pendingAds.length);
        
        // 3. 추천순으로 정렬 (null은 마지막으로)
        pendingAds.sort((a, b) => {
            if (a.recommendationOrder === null && b.recommendationOrder === null) return 0;
            if (a.recommendationOrder === null) return 1;
            if (b.recommendationOrder === null) return -1;
            return a.recommendationOrder - b.recommendationOrder;
        });
        
        return pendingAds;
        
    } catch (error) {
        console.error('문의 데이터 로드 오류:', error);
        console.error('오류 상세:', error.code, error.message);
        return [];
    }
}

// 문의 아이템 클릭 처리
function handleInquiryItemClick(ad) {
    // 연락처 정보 팝업 표시
    const kakaoContact = ad.socialContact?.kakao || '';
    const phoneContact = ad.contactPhone || '';
    
    let contactInfo = `${ad.businessName}\n담당자: ${ad.userNickname}\n\n`;
    
    if (kakaoContact) {
        contactInfo += `카카오톡: ${kakaoContact}\n`;
    }
    if (phoneContact) {
        contactInfo += `전화번호: ${phoneContact}\n`;
    }
    
    // 모바일에서는 전화번호 클릭 시 전화 연결 옵션 제공
    if (phoneContact && window.confirm(contactInfo + '\n\n전화로 연결하시겠습니까?')) {
        window.location.href = `tel:${phoneContact}`;
    } else {
        alert(contactInfo);
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