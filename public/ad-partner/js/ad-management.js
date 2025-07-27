// 파일경로: /ad-partner/js/ad-management.js
// 파일이름: ad-management.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let adData = null;

// URL 파라미터에서 제휴 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
let adId = urlParams.get('id');

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
    if (!userDoc.exists() || userDoc.data().userType !== 'partner') {
        alert('파트너회원만 이용할 수 있습니다.');
        window.location.href = '/index.html';
        return;
    }
    
    // 제휴 상세 정보 로드
    loadAdDetail();
});

// 제휴 상세 정보 로드
async function loadAdDetail() {
    try {
        console.log('제휴 ID:', adId);
        
        // ID가 없으면 첫 번째 제휴 데이터를 찾아서 로드
        if (!adId) {
            const firstPartnership = await getFirstPartnership();
            if (!firstPartnership) {
                showNoPartnershipMessage();
                return;
            }
            adId = firstPartnership.id;
            adData = firstPartnership;
        } else {
            // ID가 있으면 해당 제휴 데이터 로드
            const userRef = doc(db, 'users', currentUser.uid);
            const adDoc = await getDoc(doc(userRef, 'ad_partner', adId));
            
            if (!adDoc.exists()) {
                // 해당 ID의 문서가 없으면 첫 번째 제휴 데이터 로드
                const firstPartnership = await getFirstPartnership();
                if (!firstPartnership) {
                    showNoPartnershipMessage();
                    return;
                }
                adId = firstPartnership.id;
                adData = firstPartnership;
            } else {
                adData = {
                    id: adDoc.id,
                    ...adDoc.data()
                };
            }
        }
        
        console.log('제휴 데이터:', adData);
        
        // 제휴 데이터가 있으면 상세 정보 표시
        showPartnershipContent();
        displayAdDetail();
        displayStats();
        
    } catch (error) {
        console.error('제휴 상세 정보 로드 오류:', error);
        showNoPartnershipMessage();
    }
}

// 첫 번째 제휴 데이터 가져오기
async function getFirstPartnership() {
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const partnershipCollectionRef = collection(userRef, 'ad_partner');
        
        // 최신 순으로 정렬하여 첫 번째 문서 가져오기
        const querySnapshot = await getDocs(partnershipCollectionRef);
        
        if (querySnapshot.empty) {
            return null;
        }
        
        // 첫 번째 문서 반환
        const firstDoc = querySnapshot.docs[0];
        return {
            id: firstDoc.id,
            ...firstDoc.data()
        };
        
    } catch (error) {
        console.error('첫 번째 제휴 데이터 로드 오류:', error);
        return null;
    }
}

// 제휴 신청 안내 메시지 표시
function showNoPartnershipMessage() {
    document.getElementById('partnershipContent').style.display = 'none';
    document.getElementById('noPartnershipMessage').style.display = 'block';
}

// 제휴 상세 정보 표시
function showPartnershipContent() {
    document.getElementById('partnershipContent').style.display = 'block';
    document.getElementById('noPartnershipMessage').style.display = 'none';
}

// 제휴 상세 정보 표시
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
    
    // 첫 번째 줄: 업체명 + 지역
    const firstLineDiv = document.createElement('div');
    firstLineDiv.className = 'ad-detail-first-line';
    
    // 업체명
    const businessNameSpan = document.createElement('span');
    businessNameSpan.className = 'ad-detail-business-name';
    businessNameSpan.textContent = adData.businessName || '';
    
    // 지역
    const addressSpan = document.createElement('span');
    addressSpan.className = 'ad-detail-address';
    const region1 = adData.region1 || '';
    const region2 = adData.region2 || '';
    const regionText = region1 && region2 ? `${region1}/${region2}` : (region1 || region2 || '지역 정보 없음');
    addressSpan.textContent = regionText;
    
    firstLineDiv.appendChild(businessNameSpan);
    firstLineDiv.appendChild(addressSpan);
    
    // 두 번째 줄: 프로모션 제목
    const promotionTitleDiv = document.createElement('div');
    promotionTitleDiv.className = 'ad-detail-promotion-title';
    promotionTitleDiv.textContent = adData.promotionTitle || '프로모션 제목';
    
    // 세 번째 줄: 업종
    const businessTypeDiv = document.createElement('div');
    businessTypeDiv.className = 'ad-detail-business-type';
    businessTypeDiv.textContent = adData.businessType || '';
    
    // 정보 영역에 추가
    infoDiv.appendChild(firstLineDiv);
    infoDiv.appendChild(promotionTitleDiv);
    infoDiv.appendChild(businessTypeDiv);
    
    // 카드에 추가
    adDetailCard.appendChild(imageDiv);
    adDetailCard.appendChild(infoDiv);
}

// 통계 정보 표시
function displayStats() {
    // 추천수
    document.getElementById('recommendCount').textContent = `${(adData.recommendCount || 0).toLocaleString()} 회`;
    
    // 찜수
    document.getElementById('likeCount').textContent = `${(adData.likeCount || 0).toLocaleString()} 회`;
    
    // 클릭수
    document.getElementById('clickCount').textContent = `${(adData.clickCount || 0).toLocaleString()} 회`;
    
    // 승인상태
    const statusText = getStatusText(adData.status || 'pending');
    document.getElementById('approvalStatus').textContent = statusText;
}

// 상태 텍스트 변환
function getStatusText(status) {
    const statusMap = {
        'active': '제휴중',
        'pending': '승인대기',
        'expired': '만료',
        'rejected': '반려',
        'approved': '승인완료'
    };
    return statusMap[status] || status;
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('제휴 관리 페이지 로드 완료');
});