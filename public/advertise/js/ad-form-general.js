// 파일 경로: /advertise/js/ad-form-general.js

import { db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// 일반 광고 폼 초기화
export function initGeneralAdForm(userData, selectedAdType, adPrice) {
    // 선택한 광고 제목 표시
    const selectedAdTitle = document.getElementById('selectedAdTitle');
    const selectedProductName = document.getElementById('selectedProductName');
    
    if (selectedAdTitle && selectedAdType) {
        selectedAdTitle.textContent = selectedAdType.name;
    }
    
    if (selectedProductName && selectedAdType) {
        selectedProductName.textContent = selectedAdType.name;
    }
    
    // 기업회원 정보로 폼 자동 채우기
    if (userData) {
        const businessName1 = document.getElementById('businessName1');
        const contactName1 = document.getElementById('contactName1');
        const contactPhone1 = document.getElementById('contactPhone1');
        const contactEmail1 = document.getElementById('contactEmail1');
        
        // business_users의 경우
        if (userData.storeName) {
            if (businessName1) businessName1.value = userData.storeName;
        }
        // partner_users의 경우
        else if (userData.companyName) {
            if (businessName1) businessName1.value = userData.companyName;
        }
        
        // 담당자명
        if (contactName1) {
            if (userData.name) {
                contactName1.value = userData.name;
            } else if (userData.managerName) {
                contactName1.value = userData.managerName;
            }
        }
        
        // 연락처와 이메일
        if (contactPhone1 && userData.phone) contactPhone1.value = userData.phone;
        if (contactEmail1 && userData.email) contactEmail1.value = userData.email;
    }
    
    // 오늘 날짜를 기본값으로 설정
    const startDate1 = document.getElementById('startDate1');
    if (startDate1) {
        const today = new Date().toISOString().split('T')[0];
        startDate1.value = today;
        startDate1.min = today;
    }
    
    // 기간 선택 버튼 이벤트
    const durationBtns = document.querySelectorAll('.duration-btn');
    const duration1Input = document.getElementById('duration1');
    
    durationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 모든 버튼에서 active 클래스 제거
            durationBtns.forEach(b => b.classList.remove('active'));
            
            // 클릭한 버튼에 active 클래스 추가
            this.classList.add('active');
            
            // hidden input 값 설정
            const value = this.getAttribute('data-value');
            if (duration1Input) {
                duration1Input.value = value;
            }
            
            // 금액 업데이트
            updateGeneralAdAmount(adPrice);
        });
    });
    
    // 초기 금액 표시
    updateGeneralAdAmount(adPrice);
}

// 금액 업데이트
export function updateGeneralAdAmount(adPrice) {
    const duration = parseInt(document.getElementById('duration1')?.value) || 0;
    const totalPrice = Math.round(adPrice * duration * 1.1); // VAT 10% 포함
    
    const monthlyAmount1 = document.getElementById('monthlyAmount1');
    const adDuration1 = document.getElementById('adDuration1');
    const totalAmount1 = document.getElementById('totalAmount1');
    
    if (monthlyAmount1) monthlyAmount1.textContent = adPrice.toLocaleString() + '원';
    if (adDuration1) adDuration1.textContent = duration > 0 ? duration + '개월' : '-';
    if (totalAmount1) totalAmount1.textContent = totalPrice.toLocaleString() + '원';
}

// 이미지 업로드
async function uploadImages(files, userId, adId) {
    const uploadPromises = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `ads/${userId}/${adId}/${Date.now()}_${i}_${file.name}`;
        const storageRef = ref(storage, fileName);
        
        uploadPromises.push(
            uploadBytes(storageRef, file).then(snapshot => 
                getDownloadURL(snapshot.ref)
            )
        );
    }
    
    return Promise.all(uploadPromises);
}

// 일반 광고 폼 제출
export function submitGeneralAdForm(currentUser, selectedAdType, adPrice) {
    const form = document.getElementById('generalAdvertiseForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        // 기간 선택 확인
        const duration = document.getElementById('duration1')?.value;
        if (!duration) {
            alert('광고 기간을 선택해주세요.');
            return;
        }
        
        try {
            // business_users 컬렉션에서 현재 사용자 정보 가져오기
            let userDoc = await getDoc(doc(db, 'business_users', currentUser.uid));
            let userData = userDoc.exists() ? userDoc.data() : null;
            
            // business_users에 없으면 partner_users에서 확인
            if (!userData) {
                userDoc = await getDoc(doc(db, 'partner_users', currentUser.uid));
                userData = userDoc.exists() ? userDoc.data() : null;
            }
            
            if (!userData) {
                alert('사용자 정보를 찾을 수 없습니다.');
                return;
            }
            
            const formData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userNickname: userData?.nickname || '',
                storeCode: userData?.storeCode || '',
                adType: selectedAdType?.type || '',
                adCategory: 'general',
                adName: selectedAdType?.name || '',
                businessName: document.getElementById('businessName1')?.value.trim() || '',
                contactName: document.getElementById('contactName1')?.value.trim() || '',
                contactPhone: document.getElementById('contactPhone1')?.value.trim() || '',
                contactEmail: document.getElementById('contactEmail1')?.value.trim() || '',
                targetUrl: document.getElementById('targetUrl1')?.value.trim() || '',
                adContent: document.getElementById('adContent1')?.value.trim() || '',
                startDate: document.getElementById('startDate1')?.value || '',
                duration: parseInt(duration) || 0,
                monthlyAmount: adPrice,
                totalAmount: adPrice * (parseInt(duration) || 0),
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 이미지 파일 처리
            const adImages = document.getElementById('adImages1')?.files;
            if (!adImages || adImages.length === 0) {
                alert('광고 이미지를 업로드해주세요.');
                return;
            }
            
            // 광고 정보 먼저 저장
            const docRef = await addDoc(collection(db, 'ad_requests_general'), formData);
            
            // 이미지 업로드
            const imageUrls = await uploadImages(adImages, currentUser.uid, docRef.id);
            
            // 이미지 URL 업데이트
            await updateDoc(doc(db, 'advertise', docRef.id), {
                adImages: imageUrls
            });
            
            alert('광고 신청이 완료되었습니다. 관리자 검토 후 연락드리겠습니다.');
            
            // 광고 상태 페이지로 이동
            window.location.href = '/advertise/html/ad-list.html';
            
        } catch (error) {
            console.error('광고 신청 오류:', error);
            alert('광고 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    });
}

// 취소 버튼
window.cancelAdForm = function() {
    if (confirm('광고 신청을 취소하시겠습니까?')) {
        window.location.href = '/advertise/html/ad-add.html';
    }
}