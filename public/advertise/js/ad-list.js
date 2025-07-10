import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let allAds = [];

// 광고 유형별 이름
const adTypeNames = {
    top: '탑광고',
    vip: 'VIP 채용관',
    premium: 'Premium 채용관',
    basic: 'Basic 채용관',
    inquiry: '실시간 현황 문의하기'
};

// 상태별 이름
const statusNames = {
    pending: '검토중',
    approved: '승인',
    active: '진행중',
    expired: '만료',
    rejected: '거절'
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
    
    // 광고 목록 로드
    loadAdList();
});

// 광고 목록 로드
async function loadAdList() {
    try {
        // 현재 사용자의 광고만 가져오기
        const q = query(
            collection(db, 'ad_requests'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        allAds = [];
        querySnapshot.forEach((doc) => {
            allAds.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 광고 상태 업데이트 (날짜 기반)
        updateAdStatuses();
        
        displayAds(allAds);
    } catch (error) {
        console.error('광고 목록 로드 오류:', error);
    }
}

// 광고 상태 업데이트
function updateAdStatuses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    allAds.forEach(ad => {
        // 승인된 광고만 날짜 체크
        if (ad.status === 'approved' || ad.status === 'active') {
            const startDate = new Date(ad.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            // 종료일 계산
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + ad.duration);
            
            if (today < startDate) {
                ad.status = 'approved'; // 아직 시작 전
            } else if (today >= startDate && today <= endDate) {
                ad.status = 'active'; // 진행중
            } else {
                ad.status = 'expired'; // 만료
            }
        }
    });
}

// 광고 목록 표시
function displayAds(ads) {
    const adList = document.getElementById('adList');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (ads.length === 0) {
        adList.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    
    adList.innerHTML = ads.map(ad => {
        const startDate = new Date(ad.startDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + ad.duration);
        
        // 진행률 계산
        let progressPercent = 0;
        let remainingDays = 0;
        
        if (ad.status === 'active') {
            const today = new Date();
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const elapsedDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
            progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
            remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
        }
        
        return `
            <div class="ad-card">
                <div class="ad-card-header">
                    <h3 class="ad-title">${ad.businessName}</h3>
                    <span class="ad-status ${ad.status}">${statusNames[ad.status]}</span>
                </div>
                
                <div class="ad-info">
                    <div class="info-row">
                        <span class="info-label">광고 유형:</span>
                        <span class="ad-type-badge ${ad.adType}">${adTypeNames[ad.adType]}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">신청일:</span>
                        <span class="info-value">${formatDate(ad.createdAt)}</span>
                    </div>
                </div>
                
                ${ad.status === 'active' ? `
                <div class="progress-section">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>진행률: ${Math.round(progressPercent)}%</span>
                        <span>남은 기간: ${remainingDays}일</span>
                    </div>
                </div>
                ` : ''}
                
                <div class="date-info">
                    <div class="date-row">
                        <span class="date-label">시작일:</span>
                        <span class="date-value">${formatDateString(ad.startDate)}</span>
                    </div>
                    <div class="date-row">
                        <span class="date-label">종료일:</span>
                        <span class="date-value">${formatDateString(endDate)}</span>
                    </div>
                    <div class="date-row">
                        <span class="date-label">기간:</span>
                        <span class="date-value">${ad.duration}개월</span>
                    </div>
                </div>
                
                <div class="amount-info">
                    <div class="amount-row">
                        <span class="amount-label">월 광고비:</span>
                        <span class="amount-value">${ad.monthlyAmount.toLocaleString()}원</span>
                    </div>
                    ${ad.bannerCost > 0 ? `
                    <div class="amount-row">
                        <span class="amount-label">배너 제작비:</span>
                        <span class="amount-value">${ad.bannerCost.toLocaleString()}원</span>
                    </div>
                    ` : ''}
                    ${ad.designCost > 0 ? `
                    <div class="amount-row">
                        <span class="amount-label">페이지 디자인비:</span>
                        <span class="amount-value">${ad.designCost.toLocaleString()}원</span>
                    </div>
                    ` : ''}
                    <div class="amount-row total">
                        <span class="amount-label">총 결제금액:</span>
                        <span class="amount-value">${ad.totalAmount.toLocaleString()}원</span>
                    </div>
                </div>
                
                <div class="ad-actions">
                    ${ad.status === 'pending' ? `
                        <button class="action-btn" onclick="viewDetails('${ad.id}')">상세보기</button>
                        <button class="action-btn" onclick="cancelAd('${ad.id}')">신청취소</button>
                    ` : ad.status === 'approved' ? `
                        <button class="action-btn" onclick="viewDetails('${ad.id}')">상세보기</button>
                        <button class="action-btn primary" onclick="makePayment('${ad.id}')">결제하기</button>
                    ` : ad.status === 'active' ? `
                        <button class="action-btn" onclick="viewDetails('${ad.id}')">상세보기</button>
                        <button class="action-btn" onclick="viewStats('${ad.id}')">통계보기</button>
                    ` : `
                        <button class="action-btn" onclick="viewDetails('${ad.id}')">상세보기</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
}

function formatDateString(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

// 필터링
document.getElementById('statusFilter').addEventListener('change', filterAds);
document.getElementById('typeFilter').addEventListener('change', filterAds);

function filterAds() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filteredAds = [...allAds];
    
    if (statusFilter) {
        filteredAds = filteredAds.filter(ad => ad.status === statusFilter);
    }
    
    if (typeFilter) {
        filteredAds = filteredAds.filter(ad => ad.adType === typeFilter);
    }
    
    displayAds(filteredAds);
}

// 전역 함수들
window.viewDetails = function(adId) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    // 상세 정보 모달 표시 (간단한 alert로 대체)
    const details = `
광고 상세 정보
================
업체명: ${ad.businessName}
광고 유형: ${adTypeNames[ad.adType]}
상태: ${statusNames[ad.status]}
광고 내용: ${ad.adContent}
시작일: ${formatDateString(ad.startDate)}
기간: ${ad.duration}개월
총 금액: ${ad.totalAmount.toLocaleString()}원
${ad.targetUrl ? '\n연결 URL: ' + ad.targetUrl : ''}
${ad.kakaoLink ? '\n카카오톡 링크: ' + ad.kakaoLink : ''}
${ad.additionalRequest ? '\n추가 요청사항: ' + ad.additionalRequest : ''}
    `;
    
    alert(details);
};

window.cancelAd = async function(adId) {
    if (!confirm('정말로 광고 신청을 취소하시겠습니까?\n취소 후에는 복구할 수 없습니다.')) {
        return;
    }
    
    try {
        // Firestore에서 문서 삭제
        await deleteDoc(doc(db, 'ad_requests', adId));
        
        alert('광고 신청이 취소되었습니다.');
        
        // 목록 새로고침
        loadAdList();
    } catch (error) {
        console.error('광고 취소 오류:', error);
        alert('광고 취소 중 오류가 발생했습니다.');
    }
};

window.makePayment = function(adId) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    alert(`결제 기능은 준비중입니다.\n\n결제 금액: ${ad.totalAmount.toLocaleString()}원\n\n담당자가 연락드릴 예정입니다.`);
};

window.viewStats = function(adId) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    // 임시 통계 데이터
    const stats = `
광고 통계
================
광고명: ${ad.businessName}
광고 유형: ${adTypeNames[ad.adType]}

일일 노출수: ${Math.floor(Math.random() * 10000 + 5000)}회
일일 클릭수: ${Math.floor(Math.random() * 500 + 100)}회
클릭률(CTR): ${(Math.random() * 5 + 1).toFixed(2)}%

총 노출수: ${Math.floor(Math.random() * 300000 + 100000)}회
총 클릭수: ${Math.floor(Math.random() * 15000 + 5000)}회

※ 실제 통계 기능은 준비중입니다.
    `;
    
    alert(stats);
};