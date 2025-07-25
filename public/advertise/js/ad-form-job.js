// 파일 경로: /public/advertise/js/ad-form-job.js
// 파일이름: ad-form-job.js

import { db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// 전역 함수들
window.addWorkTime = function() {
    const container = document.getElementById('workTimeContainer');
    const newItem = document.createElement('div');
    newItem.className = 'work-time-item';
    
    newItem.innerHTML = `
        <input type="text" class="time-title" placeholder="예: 주간조,1부,2부">
        <select class="start-hour">
            <option value="">시작시간</option>
            ${Array.from({length: 24}, (_, i) => `<option value="${i.toString().padStart(2, '0')}시">${i.toString().padStart(2, '0')}시</option>`).join('')}
        </select>
        <span class="time-separator">~</span>
        <select class="end-hour">
            <option value="">종료시간</option>
            ${Array.from({length: 24}, (_, i) => `<option value="${i.toString().padStart(2, '0')}시">${i.toString().padStart(2, '0')}시</option>`).join('')}
        </select>
        <button type="button" class="remove-time-btn" onclick="removeWorkTime(this)">−</button>
    `;
    
    container.appendChild(newItem);
};

window.removeWorkTime = function(button) {
    button.closest('.work-time-item').remove();
};

window.updateSalaryLabel = function() {
    const salaryType = document.querySelector('input[name="salaryType"]:checked')?.value;
    const salaryLabel = document.getElementById('salaryLabel');
    
    if (salaryLabel) {
        const labels = {
            'hourly': '시급',
            'weekly': '주급',
            'daily': '일급',
            'monthly': '월급'
        };
        salaryLabel.textContent = labels[salaryType] || '급여';
    }
};

// 이미지 미리보기 제거
window.removePreviewImage = function(index) {
    const preview = document.getElementById('detailImagesPreview');
    const fileInput = document.getElementById('detailImages');
    const uploadText = document.querySelector('.upload-text');
    
    if (preview && fileInput) {
        const dt = new DataTransfer();
        const { files } = fileInput;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) dt.items.add(files[i]);
        }
        
        fileInput.files = dt.files;
        updateImagePreview();
    }
};

// 이미지 미리보기 업데이트
function updateImagePreview() {
    const fileInput = document.getElementById('detailImages');
    const preview = document.getElementById('detailImagesPreview');
    const uploadText = document.querySelector('.upload-text');
    
    if (!fileInput || !preview) return;
    
    preview.innerHTML = '';
    
    if (fileInput.files.length === 0) {
        uploadText.textContent = '선택된 파일 없음';
        return;
    }
    
    uploadText.textContent = `${fileInput.files.length}개 파일 선택됨`;
    
    Array.from(fileInput.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="상세 이미지 ${index + 1}">
                <button type="button" class="preview-remove" onclick="removePreviewImage(${index})">×</button>
            `;
            preview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// 폼 초기화
export async function initJobAdForm(userData) {
    // 기업 정보 자동 입력
    if (userData) {
        const fields = {
            'businessName2': userData.storeName,
            'contactName2': userData.name,
            'contactPhone2': userData.phone,
            'businessType': userData.businessType,
            'region1': userData.region1,
            'region2': userData.region2
        };
        
        for (const [id, value] of Object.entries(fields)) {
            const element = document.getElementById(id);
            if (element && value) element.value = value;
        }
    }
    
    // 첫 번째 근무시간 옵션 초기화
    const startHour = document.querySelector('.start-hour');
    const endHour = document.querySelector('.end-hour');
    
    if (startHour && endHour) {
        for (let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0');
            startHour.innerHTML += `<option value="${hour}시">${hour}시</option>`;
            endHour.innerHTML += `<option value="${hour}시">${hour}시</option>`;
        }
    }
    
    // 복지 버튼 클릭 이벤트
    document.querySelectorAll('.welfare-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });
    
    // 이미지 업로드 이벤트
    const detailImagesInput = document.getElementById('detailImages');
    if (detailImagesInput) {
        detailImagesInput.addEventListener('change', function(e) {
            const files = e.target.files;
            
            if (files.length > 5) {
                alert('상세 이미지는 최대 5장까지 업로드 가능합니다.');
                e.target.value = '';
                return;
            }
            
            // 파일 크기 및 타입 검증
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            for (let file of files) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('이미지 파일은 5MB 이하만 업로드 가능합니다.');
                    e.target.value = '';
                    return;
                }
                if (!allowedTypes.includes(file.type)) {
                    alert('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF)');
                    e.target.value = '';
                    return;
                }
            }
            
            updateImagePreview();
        });
    }
}

// 폼 제출
export async function submitJobAdForm(currentUser) {
    const form = document.getElementById('jobAdvertiseForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        try {
            // 근무 시간 수집
            const workTimes = [];
            document.querySelectorAll('.work-time-item').forEach(item => {
                const title = item.querySelector('.time-title')?.value.trim();
                const startTime = item.querySelector('.start-hour')?.value;
                const endTime = item.querySelector('.end-hour')?.value;
                
                if (title && startTime && endTime) {
                    workTimes.push({ title, startTime, endTime });
                }
            });
            
            if (workTimes.length === 0) {
                alert('최소 하나의 근무 시간을 입력해주세요.');
                return;
            }
            
            // 복지 수집
            const welfare = Array.from(document.querySelectorAll('.welfare-btn.active'))
                .map(btn => btn.getAttribute('data-value'));
            
            // 폼 데이터 수집
            const formData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                adType: 'job',
                adCategory: 'job',
                businessName: document.getElementById('businessName2')?.value || '',
                businessType: document.getElementById('businessType')?.value || '',
                contactName: document.getElementById('contactName2')?.value || '',
                contactPhone: document.getElementById('contactPhone2')?.value || '',
                socialContact: {
                    kakao: document.getElementById('kakaoContact')?.value || '',
                    telegram: document.getElementById('telegramContact')?.value || '',
                    line: document.getElementById('lineContact')?.value || '',
                    wechat: document.getElementById('wechatContact')?.value || ''
                },
                workRegion1: document.getElementById('region1')?.value || '',
                workRegion2: document.getElementById('region2')?.value || '',
                duration: parseInt(document.querySelector('.duration-btn.active')?.getAttribute('data-value')) || 1,
                salaryType: document.querySelector('input[name="salaryType"]:checked')?.value || '',
                salary: document.getElementById('salary')?.value || '',
                workTimes: workTimes,
                welfare: welfare,
                detailContent: document.getElementById('detailContent')?.value || '',
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 임시 문서 ID 생성
            const tempDocId = `${currentUser.uid}_${Date.now()}`;
            
            // 이미지 업로드 처리
            const detailImages = document.getElementById('detailImages')?.files;
            if (detailImages && detailImages.length > 0) {
                const detailImageUrls = [];
                
                for (let i = 0; i < detailImages.length; i++) {
                    const file = detailImages[i];
                    const detailRef = ref(storage, `ad_requests_job/${currentUser.uid}/${tempDocId}/detail_${i}_${file.name}`);
                    const detailSnapshot = await uploadBytes(detailRef, file);
                    const detailUrl = await getDownloadURL(detailSnapshot.ref);
                    detailImageUrls.push(detailUrl);
                }
                
                formData.detailImageUrls = detailImageUrls;
                formData.hasDetailImages = true;
                formData.detailImagesCount = detailImages.length;
            }
            
            // DB 저장
            await addDoc(collection(db, 'ad_requests_job'), formData);
            
            alert('광고 신청이 완료되었습니다.');
            window.location.href = '/advertise/ad-list.html';
            
        } catch (error) {
            console.error('광고 신청 오류:', error);
            alert('광고 신청 중 오류가 발생했습니다.');
        }
    });
    
    // 기간 선택 버튼
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}