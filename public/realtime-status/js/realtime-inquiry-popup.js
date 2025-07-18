// 파일 경로: /public/realtime-status/js/realtime-inquiry-popup.js

import { db } from '/js/firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 문의 배너 기능 초기화
export async function initializeInquiryPopup() {
    // 모든 status-card를 가져와서 각각에 대해 배너 로드
    const statusCards = document.querySelectorAll('.status-card');
    
    for (const card of statusCards) {
        // 카드에서 storeCode 추출 (data-store-code 속성 필요)
        const storeCode = card.dataset.storeCode;
        
        if (storeCode) {
            await loadInquiryBanners(card, storeCode);
        }
    }
}

// 특정 storeCode에 대한 문의 배너 로드
async function loadInquiryBanners(card, storeCode) {
    try {
        // 1. ad_requests_job에서 조건에 맞는 광고 조회
        const adsQuery = query(
            collection(db, 'ad_requests_job'),
            where('adType', '==', 'realtime'),
            where('status', '==', 'pending')
        );
        
        const adsSnapshot = await getDocs(adsQuery);
        const pendingAds = [];
        
        // 2. 각 광고에 대해 storeCode 확인 및 사용자 정보 가져오기
        for (const adDoc of adsSnapshot.docs) {
            const adData = adDoc.data();
            
            // 광고의 workRegion1과 workRegion2를 기반으로 storeCode 매칭
            // 또는 직접 storeCode 필드가 있는 경우 확인
            if (adData.storeCode === storeCode || 
                (adData.workRegion1 && adData.workRegion2 && 
                 `${adData.workRegion1}_${adData.workRegion2}` === storeCode)) {
                
                // business_users에서 추천순 정보 가져오기
                const userDoc = await getDoc(doc(db, 'business_users', adData.userId));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    pendingAds.push({
                        id: adDoc.id,
                        ...adData,
                        recommendationOrder: userData.recommendationOrder || null,
                        userNickname: userData.nickname || adData.contactName || '미등록',
                        businessName: adData.businessName || userData.storeName || ''
                    });
                }
            }
        }
        
        // 3. 추천순으로 정렬 (null은 마지막으로)
        pendingAds.sort((a, b) => {
            if (a.recommendationOrder === null && b.recommendationOrder === null) return 0;
            if (a.recommendationOrder === null) return 1;
            if (b.recommendationOrder === null) return -1;
            return a.recommendationOrder - b.recommendationOrder;
        });
        
        // 4. 배너 생성 및 카드에 추가
        if (pendingAds.length > 0) {
            createInquiryBanners(card, pendingAds);
        }
        
    } catch (error) {
        console.error('문의 배너 로드 오류:', error);
    }
}

// 문의 배너 생성
function createInquiryBanners(card, ads) {
    // 기존 문의하기 버튼 찾기
    const inquiryBtn = card.querySelector('.action-btn.inquiry');
    if (!inquiryBtn) return;
    
    // 기존 배너 영역이 있으면 제거
    const existingBannerArea = card.querySelector('.inquiry-banner-area');
    if (existingBannerArea) {
        existingBannerArea.remove();
    }
    
    // 배너 영역 생성
    const bannerArea = document.createElement('div');
    bannerArea.className = 'inquiry-banner-area';
    
    // 템플릿 가져오기
    const bannerTemplate = document.getElementById('inquiry-banner-template');
    if (!bannerTemplate) {
        console.error('inquiry-banner-template을 찾을 수 없습니다.');
        return;
    }
    
    // 각 광고에 대한 배너 생성 (최대 3개까지만 표시)
    const maxBanners = 3;
    ads.slice(0, maxBanners).forEach((ad, index) => {
        // 템플릿 복제
        const banner = bannerTemplate.content.cloneNode(true);
        
        // 카카오톡 연락처 우선 표시
        const kakaoContact = ad.socialContact?.kakao || '';
        const phoneContact = ad.contactPhone || '';
        const displayContact = kakaoContact || phoneContact || '연락처 없음';
        
        // 데이터 채우기
        banner.querySelector('.banner-business').textContent = ad.businessName;
        banner.querySelector('.banner-nickname').textContent = ad.userNickname;
        banner.querySelector('.banner-contact').textContent = displayContact;
        
        // 배너 요소 가져오기
        const bannerElement = banner.querySelector('.inquiry-banner');
        
        // 클릭 이벤트 추가
        bannerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            handleInquiryBannerClick(ad);
        });
        
        bannerArea.appendChild(bannerElement);
    });
    
    // 더 많은 문의가 있는 경우 표시
    if (ads.length > maxBanners) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'more-inquiries';
        moreIndicator.textContent = `+${ads.length - maxBanners}개 더보기`;
        moreIndicator.addEventListener('click', (e) => {
            e.stopPropagation();
            showAllInquiries(card, ads);
        });
        bannerArea.appendChild(moreIndicator);
    }
    
    // card-actions 영역 바로 위에 배너 영역 삽입
    const cardActions = card.querySelector('.card-actions');
    if (cardActions) {
        card.insertBefore(bannerArea, cardActions);
    } else {
        card.appendChild(bannerArea);
    }
    
    // 기존 문의하기 버튼 숨기기
    inquiryBtn.style.display = 'none';
}

// 문의 배너 클릭 처리
function handleInquiryBannerClick(ad) {
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

// 모든 문의 보기
function showAllInquiries(card, ads) {
    // 모바일/PC 분기
    if (window.innerWidth <= 768) {
        showMobileAllInquiries(card, ads);
    } else {
        showDesktopAllInquiries(card, ads);
    }
}

// 모바일 전체 문의 보기
function showMobileAllInquiries(card, ads) {
    // 기존 열린 팝업 닫기
    closeAllMobilePopups();
    
    // 활성화
    card.classList.add('active');
    
    // 템플릿 가져오기
    const listTemplate = document.getElementById('mobile-inquiry-list-template');
    const itemTemplate = document.getElementById('inquiry-item-template');
    
    if (!listTemplate || !itemTemplate) {
        console.error('문의 목록 템플릿을 찾을 수 없습니다.');
        return;
    }
    
    // 템플릿 복제
    const area = listTemplate.content.cloneNode(true);
    const container = area.querySelector('.inquiry-list-container');
    
    // 각 광고에 대한 아이템 생성
    ads.forEach((ad, index) => {
        const item = itemTemplate.content.cloneNode(true);
        
        // 데이터 채우기
        item.querySelector('.business-name').textContent = ad.businessName;
        item.querySelector('.nickname').textContent = ad.userNickname;
        item.querySelector('.contact').textContent = ad.socialContact?.kakao || ad.contactPhone || '연락처 없음';
        
        // 아이템 요소 가져오기
        const itemElement = item.querySelector('.inquiry-item');
        itemElement.dataset.adId = ad.id;
        
        // 클릭 이벤트 추가
        itemElement.addEventListener('click', () => {
            handleInquiryBannerClick(ad);
        });
        
        container.appendChild(itemElement);
    });
    
    // 선택된 카드 바로 다음에 삽입
    const areaElement = area.querySelector('.mobile-action-area');
    card.parentNode.insertBefore(areaElement, card.nextSibling);
}

// PC 전체 문의 보기
function showDesktopAllInquiries(card, ads) {
    const rightSection = document.querySelector('.right-section');
    const mainContainer = document.querySelector('.main-container');
    
    // 기존 활성화 제거
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    // 활성화
    card.classList.add('active');
    mainContainer.classList.add('right-active');
    
    // 템플릿 가져오기
    const listTemplate = document.getElementById('desktop-inquiry-list-template');
    const itemTemplate = document.getElementById('inquiry-item-template');
    
    if (!listTemplate || !itemTemplate) {
        console.error('문의 목록 템플릿을 찾을 수 없습니다.');
        return;
    }
    
    // 템플릿 복제
    const content = listTemplate.content.cloneNode(true);
    const container = content.querySelector('.inquiry-list-container');
    
    // 각 광고에 대한 아이템 생성
    ads.forEach((ad, index) => {
        const item = itemTemplate.content.cloneNode(true);
        
        // 데이터 채우기
        item.querySelector('.business-name').textContent = ad.businessName;
        item.querySelector('.nickname').textContent = ad.userNickname;
        item.querySelector('.contact').textContent = ad.socialContact?.kakao || ad.contactPhone || '연락처 없음';
        
        // 아이템 요소 가져오기
        const itemElement = item.querySelector('.inquiry-item');
        itemElement.dataset.adId = ad.id;
        
        // 클릭 이벤트 추가
        itemElement.addEventListener('click', () => {
            handleInquiryBannerClick(ad);
        });
        
        container.appendChild(itemElement);
    });
    
    // 우측 섹션에 내용 넣기
    rightSection.innerHTML = '';
    rightSection.appendChild(content);
    rightSection.style.display = 'flex';
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