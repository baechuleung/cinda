import { auth, db } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 채용관 광고 폼 초기화
export function initJobAdForm(userData, selectedAdType, adPrice) {
    // 기업회원 정보로 폼 자동 채우기
    if (userData) {
        document.getElementById('businessName2').value = userData.storeName || '';
        document.getElementById('contactName2').value = userData.name || '';
        document.getElementById('contactPhone2').value = userData.phone || '';
        document.getElementById('contactEmail2').value = userData.email || '';
    }
    
    // 선택한 광고 유형 표시
    if (selectedAdType) {
        document.getElementById('selectedAdType2').value = selectedAdType.name;
    }
    
    // 최소 날짜 설정
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate2');
    if (startDateInput) {
        startDateInput.setAttribute('min', tomorrowStr);
        startDateInput.value = tomorrowStr;
    }
    
    // 금액 업데이트
    updateJobAdAmount(adPrice);
}

// 채용관 광고 금액 업데이트
export function updateJobAdAmount(adPrice) {
    const duration = parseInt(document.getElementById('duration2').value) || 0;
    const totalPrice = adPrice * duration;
    
    document.getElementById('monthlyAmount2').textContent = adPrice.toLocaleString() + '원';
    document.getElementById('adDuration2').textContent = duration + '개월';
    document.getElementById('totalAmount2').textContent = totalPrice.toLocaleString() + '원';
}

// 채용관 광고 폼 제출
export async function submitJobAdForm(currentUser, selectedAdType, adPrice) {
    const form = document.getElementById('jobAdvertiseForm');
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
                adCategory: 'job',
                adName: selectedAdType.name,
                businessName: document.getElementById('businessName2').value.trim(),
                businessType: document.getElementById('businessType').value,
                contactName: document.getElementById('contactName2').value.trim(),
                contactPhone: document.getElementById('contactPhone2').value.trim(),
                contactEmail: document.getElementById('contactEmail2').value.trim(),
                jobTitle: document.getElementById('jobTitle').value.trim(),
                workLocation: document.getElementById('workLocation').value.trim(),
                workAddress: document.getElementById('workAddress').value.trim(),
                salary: document.getElementById('salary').value.trim(),
                workTime: document.getElementById('workTime').value.trim(),
                jobDescription: document.getElementById('jobDescription').value.trim(),
                recruitCount: document.getElementById('recruitCount').value.trim(),
                experience: document.getElementById('experience').value,
                kakaoLink: document.getElementById('kakaoLink2').value.trim(),
                startDate: document.getElementById('startDate2').value,
                duration: parseInt(document.getElementById('duration2').value),
                monthlyAmount: adPrice,
                totalAmount: adPrice * parseInt(document.getElementById('duration2').value),
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 이미지 파일 처리
            const imageFile = document.getElementById('jobImage').files[0];
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
document.getElementById('jobImage')?.addEventListener('change', function(e) {
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