import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let selectedAdType = null;

// 광고 유형별 가격 정보
const adPrices = {
    top: 500000,
    vip: 300000,
    premium: 150000,
    basic: 70000,
    inquiry: 300000
};

// 광고 유형별 이름
const adTypeNames = {
    top: '탑광고',
    vip: 'VIP 채용관',
    premium: 'Premium 채용관',
    basic: 'Basic 채용관',
    inquiry: '실시간 현황 문의하기 광고'
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
    
    // 기업회원 정보로 폼 자동 채우기
    const businessData = businessDoc.data();
    document.getElementById('businessName').value = businessData.storeName || '';
    document.getElementById('contactName').value = businessData.name || '';
    document.getElementById('contactPhone').value = businessData.phone || '';
    document.getElementById('contactEmail').value = businessData.email || '';
});

// 광고 옵션 선택
window.selectOption = function(type) {
    // 기존 선택 해제
    document.querySelectorAll('.ad-option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 새로운 선택
    const selectedCard = document.querySelector(`[data-type="${type}"]`);
    selectedCard.classList.add('selected');
    
    selectedAdType = type;
    document.getElementById('adType').value = adTypeNames[type];
    
    // 금액 계산 업데이트
    updateTotalAmount();
};

// 총 금액 계산 및 업데이트
function updateTotalAmount() {
    if (!selectedAdType) {
        document.getElementById('monthlyAmount').textContent = '0원';
        document.getElementById('adDuration').textContent = '0개월';
        document.getElementById('bannerCost').textContent = '0원';
        document.getElementById('designCost').textContent = '0원';
        document.getElementById('totalAmount').textContent = '0원';
        return;
    }
    
    const duration = parseInt(document.getElementById('duration').value) || 0;
    const monthlyPrice = adPrices[selectedAdType];
    let totalPrice = monthlyPrice * duration;
    
    // 추가 서비스 비용 계산
    const bannerDesign = document.getElementById('bannerDesign')?.checked || false;
    const pageDesign = document.getElementById('pageDesign')?.checked || false;
    
    let bannerCost = 0;
    let designCost = 0;
    
    if (bannerDesign) {
        bannerCost = 20000;
        totalPrice += bannerCost;
    }
    
    if (pageDesign) {
        designCost = 50000;
        totalPrice += designCost;
    }
    
    document.getElementById('monthlyAmount').textContent = monthlyPrice.toLocaleString() + '원';
    document.getElementById('adDuration').textContent = duration + '개월';
    document.getElementById('bannerCost').textContent = bannerCost.toLocaleString() + '원';
    document.getElementById('designCost').textContent = designCost.toLocaleString() + '원';
    document.getElementById('totalAmount').textContent = totalPrice.toLocaleString() + '원';
}

// 기간 선택 시 금액 업데이트
document.getElementById('duration').addEventListener('change', updateTotalAmount);

// 오늘 날짜로 최소 날짜 설정
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    document.getElementById('startDate').setAttribute('min', tomorrowStr);
    document.getElementById('startDate').value = tomorrowStr;
});

// 폼 제출 처리
document.getElementById('advertiseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedAdType) {
        alert('광고 유형을 선택해주세요.');
        return;
    }
    
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    try {
        // 폼 데이터 수집
        const formData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            adType: selectedAdType,
            businessName: document.getElementById('businessName').value.trim(),
            contactName: document.getElementById('contactName').value.trim(),
            contactPhone: document.getElementById('contactPhone').value.trim(),
            contactEmail: document.getElementById('contactEmail').value.trim(),
            adContent: document.getElementById('adContent').value.trim(),
            startDate: document.getElementById('startDate').value,
            duration: parseInt(document.getElementById('duration').value),
            targetUrl: document.getElementById('targetUrl').value.trim(),
            kakaoLink: document.getElementById('kakaoLink').value.trim(),
            additionalRequest: document.getElementById('additionalRequest').value.trim(),
            bannerDesign: document.getElementById('bannerDesign')?.checked || false,
            pageDesign: document.getElementById('pageDesign')?.checked || false,
            monthlyAmount: adPrices[selectedAdType],
            bannerCost: (document.getElementById('bannerDesign')?.checked || false) ? 20000 : 0,
            designCost: (document.getElementById('pageDesign')?.checked || false) ? 50000 : 0,
            totalAmount: calculateTotalAmount(),
            status: 'pending', // 대기중
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // 이미지 파일 처리 (실제 구현에서는 Firebase Storage 사용)
        const imageFile = document.getElementById('adImage').files[0];
        if (imageFile) {
            // TODO: Firebase Storage에 이미지 업로드
            formData.hasImage = true;
            formData.imageName = imageFile.name;
            formData.imageSize = imageFile.size;
        }
        
        console.log('광고 신청 데이터:', formData);
        
        // Firestore에 저장
        await addDoc(collection(db, 'ad_requests'), formData);
        
        alert('광고 신청이 완료되었습니다.\n검토 후 연락드리겠습니다.');
        
        // 폼 초기화
        document.getElementById('advertiseForm').reset();
        document.querySelectorAll('.ad-option-card').forEach(card => {
            card.classList.remove('selected');
        });
        selectedAdType = null;
        updateTotalAmount();
        
    } catch (error) {
        console.error('광고 신청 오류:', error);
        alert('광고 신청 중 오류가 발생했습니다.');
    }
});

// 파일 업로드 유효성 검사
document.getElementById('adImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 파일은 5MB 이하만 업로드 가능합니다.');
            e.target.value = '';
            return;
        }
        
        // 파일 형식 체크
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            e.target.value = '';
            return;
        }
    }
});

// 총 금액 계산 함수
function calculateTotalAmount() {
    if (!selectedAdType) return 0;
    
    const duration = parseInt(document.getElementById('duration').value) || 0;
    const monthlyPrice = adPrices[selectedAdType];
    let totalPrice = monthlyPrice * duration;
    
    const bannerDesign = document.getElementById('bannerDesign')?.checked || false;
    const pageDesign = document.getElementById('pageDesign')?.checked || false;
    
    if (bannerDesign) totalPrice += 20000;
    if (pageDesign) totalPrice += 50000;
    
    return totalPrice;
}