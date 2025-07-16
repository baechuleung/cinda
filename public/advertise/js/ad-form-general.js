// 파일 경로: /advertise/js/ad-form-general.js

import { db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// 전역 변수로 선택된 파일들을 관리
window.selectedFiles = [];

// 미리보기 업데이트 함수를 전역으로 등록
window.updatePreview = function() {
    const preview = document.getElementById('adImagesPreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    window.selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="광고 이미지 ${index + 1}">
                <button type="button" class="preview-remove" onclick="removePreviewImage(${index})">×</button>
            `;
            preview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
};

// 업로드 텍스트 업데이트 함수를 전역으로 등록
window.updateUploadText = function() {
    const uploadText = document.querySelector('.upload-text');
    if (uploadText) {
        if (window.selectedFiles.length > 0) {
            uploadText.textContent = `${window.selectedFiles.length}개 파일 선택됨`;
        } else {
            uploadText.textContent = '이미지를 선택하세요';
        }
    }
};

// 미리보기 이미지 제거 함수
window.removePreviewImage = function(index) {
    // 해당 인덱스의 파일 제거
    window.selectedFiles.splice(index, 1);
    
    // 미리보기 업데이트
    window.updatePreview();
    
    // 텍스트 업데이트
    window.updateUploadText();
    
    // input 파일 목록도 업데이트
    const adImagesInput = document.getElementById('adImages1');
    if (adImagesInput) {
        // DataTransfer를 사용하여 새로운 FileList 생성
        const dataTransfer = new DataTransfer();
        window.selectedFiles.forEach(file => {
            dataTransfer.items.add(file);
        });
        adImagesInput.files = dataTransfer.files;
    }
};

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
    
    // 이미지 업로드 이벤트 초기화
    initImageUploadEvents();
    
    // 초기 금액 표시
    updateGeneralAdAmount(adPrice);
}

// 이미지 업로드 이벤트 초기화
function initImageUploadEvents() {
    const adImagesInput = document.getElementById('adImages1');
    if (adImagesInput) {
        adImagesInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            
            // 새로 선택한 파일들을 기존 파일 목록에 추가
            files.forEach(file => {
                // 이미 5장이면 추가 안함
                if (window.selectedFiles.length >= 5) {
                    alert('광고 이미지는 최대 5장까지 업로드 가능합니다.');
                    return;
                }
                
                // 파일 크기 검사
                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name}: 이미지 파일은 5MB 이하만 업로드 가능합니다.`);
                    return;
                }
                
                // 파일 타입 검사
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    alert(`${file.name}: 이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF)`);
                    return;
                }
                
                // 중복 파일 체크
                const isDuplicate = window.selectedFiles.some(f => 
                    f.name === file.name && f.size === file.size
                );
                
                if (!isDuplicate) {
                    window.selectedFiles.push(file);
                }
            });
            
            // 미리보기 업데이트
            window.updatePreview();
            
            // 파일 선택 텍스트 업데이트
            window.updateUploadText();
            
            // input 초기화 (같은 파일 다시 선택 가능하도록)
            e.target.value = '';
        });
    }
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
        
        // 이미지 확인
        if (window.selectedFiles.length === 0) {
            alert('광고 이미지를 업로드해주세요.');
            return;
        }
        
        try {
            // partner_users 컬렉션에서 현재 사용자 정보 가져오기
            const userDoc = await getDoc(doc(db, 'partner_users', currentUser.uid));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            if (!userData) {
                alert('사용자 정보를 찾을 수 없습니다.');
                return;
            }
            
            // 기본 폼 데이터 준비
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
            
            // 임시 문서 ID 생성 (이미지 업로드용)
            const tempDocId = `${currentUser.uid}_${Date.now()}`;
            
            // 이미지 업로드 처리
            const imageUrls = [];
            for (let i = 0; i < window.selectedFiles.length; i++) {
                const file = window.selectedFiles[i];
                const fileName = `ad_requests_general/${currentUser.uid}/${tempDocId}/${Date.now()}_${i}_${file.name}`;
                const storageRef = ref(storage, fileName);
                
                const snapshot = await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(snapshot.ref);
                imageUrls.push(downloadUrl);
            }
            
            // 이미지 정보를 formData에 추가
            formData.adImages = imageUrls;
            formData.hasImages = true;
            formData.imagesCount = window.selectedFiles.length;
            
            // 최종적으로 한 번에 DB에 저장
            const docRef = await addDoc(collection(db, 'ad_requests_general'), formData);
            
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