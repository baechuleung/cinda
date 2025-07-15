import { auth, db } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 일반 광고 폼 초기화
export function initGeneralAdForm(userData, selectedAdType, adPrice) {
    // 기업회원 정보로 폼 자동 채우기
    if (userData) {
        document.getElementById('businessName1').value = userData.storeName || '';
        document.getElementById('contactName1').value = userData.name || '';
        document.getElementById('contactPhone1').value = userData.phone || '';
        document.getElementById('contactEmail1').value = userData.email || '';
    }
    
    // 선택한 광고 유형 표시
    if (selectedAdType) {
        document.getElementById('selectedAdType1').value = selectedAdType.name;
    }
    
    // 최소 날짜 설정
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate1');
    if (startDateInput) {
        startDateInput.setAttribute('min', tomorrowStr);
        startDateInput.value = tomorrowStr;
    }
    
    // 금액 업데이트
    updateGeneralAdAmount(adPrice);
}

// 일반 광고 금액 업데이트
export function updateGeneralAdAmount(adPrice) {
    const duration = parseInt(document.getElementById('duration1').value) || 0;
    const totalPrice = adPrice * duration;
    
    document.getElementById('monthlyAmount1').textContent = adPrice.toLocaleString() + '원';
    document.getElementById('adDuration1').textContent = duration + '개월';
    document.getElementById('totalAmount1').textContent = totalPrice.toLocaleString() + '원';
}

// 일반 광고 폼 제출
export async function submitGeneralAdForm(currentUser, selectedAdType, adPrice) {
    const form = document.getElementById('generalAdvertiseForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        try {
            const formData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                adType: selectedAdType.type,
                adCategory: 'general',
                adName: selectedAdType.name,
                businessName: document.getElementById('businessName1').value.trim(),
                contactName: document.getElementById('contactName1').value.trim(),
                contactPhone: document.getElementById('contactPhone1').value.trim(),
                contactEmail: document.getElementById('contactEmail1').value.trim(),
                targetUrl: document.getElementById('targetUrl1').value.trim(),
                adContent: document.getElementById('adContent1').value.trim(),
                startDate: document.getElementById('startDate1').value,
                duration: parseInt(document.getElementById('duration1').value),
                monthlyAmount: adPrice,
                totalAmount: adPrice * parseInt(document.getElementById('duration1').value),
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 이미지 파일 처리
            const imageFile = document.getElementById('adImage1').files[0];
            if (imageFile) {
                formData.hasImage = true;
                formData.imageName = imageFile.name;
                formData.imageSize = imageFile.size;
                // TODO: Firebase Storage에 이미지 업로드
            }
            
            await addDoc(collection(db, 'ad_requests'), formData);
            alert('광고 신청이 완료되었습니다.\n검토 후 연락드리겠습니다.');
            window.location.href = '/advertise/html/ad-list.html';
            
        } catch (error) {
            console.error('광고 신청 오류:', error);
            alert('광고 신청 중 오류가 발생했습니다.');
        }
    });
}

// 파일 업로드 유효성 검사
document.getElementById('adImage1')?.addEventListener('change', function(e) {
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
        
        // 파일명 표시
        const label = this.nextElementSibling;
        if (label) {
            label.textContent = file.name;
        }
    }
});