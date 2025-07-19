// 파일 경로: /public/realtime-status/js/realtime-inquiry-popup.js

import { db } from '/js/firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 전역 변수로 각 카드의 광고 데이터 저장
const cardInquiryData = new Map();

// Firebase Auth 인스턴스
const auth = getAuth();

// 현재 로그인한 사용자 ID 가져오기
function getCurrentUserId() {
    return auth.currentUser?.uid || null;
}

// 사용자가 특정 업체에 좋아요 했는지 확인
async function checkUserLike(businessUserId, currentUserId) {
    try {
        const likeDoc = await getDoc(
            doc(db, 'business_users', businessUserId, 'likes', currentUserId)
        );
        return likeDoc.exists();
    } catch (error) {
        console.error('좋아요 확인 오류:', error);
        return false;
    }
}

// 문의 팝업 기능 초기화
export async function initializeInquiryPopup() {
    console.log('문의 팝업 초기화 시작');
    
    // inquiry.html의 템플릿 로드
    await loadInquiryTemplates();
    
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

// inquiry.html에서 템플릿 로드
async function loadInquiryTemplates() {
    try {
        const response = await fetch('/realtime-status/html/inquiry.html');
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        // 템플릿들을 현재 문서에 추가
        const templates = doc.querySelectorAll('template');
        templates.forEach(template => {
            if (!document.getElementById(template.id)) {
                document.body.appendChild(template.cloneNode(true));
            }
        });
    } catch (error) {
        console.error('템플릿 로드 오류:', error);
    }
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
async function openMobileInquiry(card, location, button, ads) {
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
    let area;
    
    if (ads.length > 0) {
        // 문의 가능한 업체가 있는 경우 - 템플릿 사용
        const template = document.getElementById('mobile-inquiry-list-template');
        area = template.content.cloneNode(true).querySelector('.mobile-action-area');
        
        // location 설정
        area.querySelector('.location-tag').textContent = location;
        
        // 문의 아이템 추가
        const container = area.querySelector('.inquiry-list-container');
        const itemTemplate = document.getElementById('inquiry-item-template');
        
        for (const ad of ads) {
            const item = itemTemplate.content.cloneNode(true).querySelector('.inquiry-item');
            
            // 데이터 설정
            item.querySelector('.business-name').textContent = ad.userNickname;
            
            const phoneBtn = item.querySelector('.inquiry-phone-btn');
            phoneBtn.dataset.phone = ad.contactPhone || '';
            phoneBtn.dataset.nickname = ad.userNickname;
            
            const likeBtn = item.querySelector('.inquiry-like-btn');
            likeBtn.dataset.userid = ad.userId;
            likeBtn.querySelector('.like-count').textContent = ad.likeCount || 0;
            
            // 현재 사용자가 이미 좋아요했는지 확인
            const currentUserId = getCurrentUserId();
            if (currentUserId) {
                const hasLiked = await checkUserLike(ad.userId, currentUserId);
                if (hasLiked) {
                    likeBtn.classList.add('liked');
                }
            }
            
            container.appendChild(item);
        }
    } else {
        // 문의 가능한 업체가 없는 경우 - 템플릿 사용
        const template = document.getElementById('mobile-inquiry-empty-template');
        area = template.content.cloneNode(true).querySelector('.mobile-action-area');
        
        // location 설정
        area.querySelector('.location-tag').textContent = location;
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
async function openDesktopInquiry(card, location, button, ads) {
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
    
    // 기존 내용 제거
    rightSection.innerHTML = '';
    
    let content;
    
    if (ads.length > 0) {
        // 문의 가능한 업체가 있는 경우 - 템플릿 사용
        const template = document.getElementById('desktop-inquiry-list-template');
        content = template.content.cloneNode(true);
        
        // location 설정
        content.querySelector('.location-tag').textContent = location;
        
        // 문의 아이템 추가
        const container = content.querySelector('.inquiry-list-container');
        const itemTemplate = document.getElementById('inquiry-item-template');
        
        for (const ad of ads) {
            const item = itemTemplate.content.cloneNode(true).querySelector('.inquiry-item');
            
            // 데이터 설정
            item.querySelector('.business-name').textContent = ad.userNickname;
            
            const phoneBtn = item.querySelector('.inquiry-phone-btn');
            phoneBtn.dataset.phone = ad.contactPhone || '';
            phoneBtn.dataset.nickname = ad.userNickname;
            
            const likeBtn = item.querySelector('.inquiry-like-btn');
            likeBtn.dataset.userid = ad.userId;
            likeBtn.querySelector('.like-count').textContent = ad.likeCount || 0;
            
            // 현재 사용자가 이미 좋아요했는지 확인
            const currentUserId = getCurrentUserId();
            if (currentUserId) {
                const hasLiked = await checkUserLike(ad.userId, currentUserId);
                if (hasLiked) {
                    likeBtn.classList.add('liked');
                }
            }
            
            container.appendChild(item);
        }
    } else {
        // 문의 가능한 업체가 없는 경우 - 템플릿 사용
        const template = document.getElementById('desktop-inquiry-empty-template');
        content = template.content.cloneNode(true);
        
        // location 설정
        content.querySelector('.location-tag').textContent = location;
    }
    
    rightSection.appendChild(content);
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
    const nickname = this.dataset.nickname;
    
    if (!phone) {
        alert('등록된 전화번호가 없습니다.');
        return;
    }
    
    const contactInfo = `담당자: ${nickname}\n전화번호: ${phone}`;
    
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
    
    const businessUserId = this.dataset.userid;
    const button = this;
    const likeCountElement = button.querySelector('.like-count');
    const currentUserId = getCurrentUserId();
    
    console.log('좋아요 클릭 - 현재 사용자 ID:', currentUserId);
    console.log('좋아요 대상 business user ID:', businessUserId);
    
    if (!currentUserId) {
        alert('로그인이 필요한 기능입니다.');
        return;
    }
    
    try {
        // 버튼 비활성화
        button.disabled = true;
        
        // 좋아요 상태 확인
        const likeRef = doc(db, 'business_users', businessUserId, 'likes', currentUserId);
        const likeDoc = await getDoc(likeRef);
        const isLiked = likeDoc.exists();
        
        if (isLiked) {
            // 좋아요 취소
            await deleteDoc(likeRef);
            
            // 현재 숫자 감소
            const currentCount = parseInt(likeCountElement.textContent || 0);
            likeCountElement.textContent = Math.max(0, currentCount - 1);
            
            // 버튼 스타일 제거
            button.classList.remove('liked');
        } else {
            // 좋아요 추가
            await setDoc(likeRef, {
                userId: currentUserId,
                likedAt: new Date()
            });
            
            // 현재 숫자 증가
            const currentCount = parseInt(likeCountElement.textContent || 0);
            likeCountElement.textContent = currentCount + 1;
            
            // 버튼 스타일 변경
            button.classList.add('liked');
        }
        
        // 클릭 효과
        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
        
        // 버튼 다시 활성화
        button.disabled = false;
        
    } catch (error) {
        console.error('좋아요 처리 오류:', error);
        alert('좋아요 처리 중 오류가 발생했습니다.');
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
        
        // 2. 각 광고에 대해 storeCode 배열 확인
        for (const adDoc of adsSnapshot.docs) {
            const adData = adDoc.data();
            
            // storeCode가 배열에 포함되어 있는지 확인
            if (adData.storeCode && adData.storeCode.includes(storeCode)) {
                const businessUserId = adData.userId;
                
                // 3. likes 서브컬렉션에서 좋아요 수 가져오기
                const likesSnapshot = await getDocs(
                    collection(db, 'business_users', businessUserId, 'likes')
                );
                const likeCount = likesSnapshot.size;
                
                pendingAds.push({
                    ...adData,
                    userId: businessUserId,
                    userNickname: adData.userNickname || '담당자',
                    contactPhone: adData.contactPhone || '',
                    likeCount: likeCount
                });
                
                console.log('매칭된 광고:', {
                    userNickname: adData.userNickname,
                    storeCode: storeCode,
                    likeCount: likeCount
                });
            }
        }
        
        console.log(`storeCode ${storeCode}에 대한 광고 수:`, pendingAds.length);
        
        // 4. 좋아요 수로 정렬 (높은 순서대로)
        pendingAds.sort((a, b) => {
            return b.likeCount - a.likeCount;
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