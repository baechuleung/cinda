// 파일 경로: /public/advertise/js/ad-form-job.js
// 파일이름: ad-form-job.js

import { auth, db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// 전역 함수로 선언하여 HTML onclick에서 접근 가능하도록 함
window.addWorkTime = function() {
    const container = document.getElementById('workTimeContainer');
    const newItem = document.createElement('div');
    newItem.className = 'work-time-item';
    
    // 새 요소 생성
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'time-title';
    titleInput.placeholder = '예: 주간조,1부,2부';
    
    const startHour = document.createElement('select');
    startHour.className = 'start-hour';
    startHour.innerHTML = '<option value="">시작시간</option>';
    
    const separator = document.createElement('span');
    separator.className = 'time-separator';
    separator.textContent = '~';
    
    const endHour = document.createElement('select');
    endHour.className = 'end-hour';
    endHour.innerHTML = '<option value="">종료시간</option>';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-time-btn';
    removeBtn.textContent = '−';
    removeBtn.onclick = function() { removeWorkTime(this); };
    
    // 시간 옵션 추가 (0시~23시)
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        
        const startOption = document.createElement('option');
        startOption.value = `${hour}시`;
        startOption.textContent = `${hour}시`;
        startHour.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = `${hour}시`;
        endOption.textContent = `${hour}시`;
        endHour.appendChild(endOption);
    }
    
    // 요소들을 새 아이템에 추가
    newItem.appendChild(titleInput);
    newItem.appendChild(startHour);
    newItem.appendChild(separator);
    newItem.appendChild(endHour);
    newItem.appendChild(removeBtn);
    
    container.appendChild(newItem);
};

// 근무시간 항목 제거 함수
window.removeWorkTime = function(button) {
    const item = button.closest('.work-time-item');
    item.remove();
};

// 급여 형태 라벨 업데이트 함수
window.updateSalaryLabel = function() {
    const salaryType = document.querySelector('input[name="salaryType"]:checked')?.value;
    const salaryLabel = document.getElementById('salaryLabel');
    
    if (salaryLabel) {
        switch(salaryType) {
            case 'hourly':
                salaryLabel.textContent = '시급';
                break;
            case 'daily':
                salaryLabel.textContent = '일급';
                break;
            case 'monthly':
                salaryLabel.textContent = '월급';
                break;
            default:
                salaryLabel.textContent = '급여';
        }
    }
};

// 미리보기 이미지 제거 함수
window.removePreviewImage = function(index) {
    const preview = document.getElementById('detailImagesPreview');
    const fileInput = document.getElementById('detailImages');
    const uploadText = document.querySelector('.upload-text');
    
    if (preview && fileInput) {
        // DataTransfer를 사용하여 특정 파일 제거
        const dt = new DataTransfer();
        const { files } = fileInput;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) dt.items.add(files[i]);
        }
        
        fileInput.files = dt.files;
        
        // 미리보기 다시 렌더링
        preview.innerHTML = '';
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const reader = new FileReader();
            const currentIndex = i;
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="상세 이미지 ${currentIndex + 1}">
                    <button type="button" class="preview-remove" onclick="removePreviewImage(${currentIndex})">×</button>
                `;
                preview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        }
        
        // 텍스트 업데이트
        if (uploadText) {
            if (fileInput.files.length > 0) {
                uploadText.textContent = `${fileInput.files.length}개 파일 선택됨`;
            } else {
                uploadText.textContent = '선택된 파일 없음';
            }
        }
    }
};

// 로딩 표시 함수
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

// 로딩 숨김 함수
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

// 채용관 광고 폼 초기화
export async function initJobAdForm(userData, selectedAdType, adPrice) {
    // 선택한 광고 제목 표시
    if (selectedAdType) {
        const titleElement = document.getElementById('selectedAdTitle');
        if (titleElement) {
            titleElement.textContent = selectedAdType.name;
        }
        
        // STEP 3, 4 표시 여부 결정 (실시간 현황판이 아닌 경우에만 표시)
        const step3Box = document.getElementById('step3Box');
        const step4Box = document.getElementById('step4Box');
        
        if (selectedAdType.type === 'realtime') {
            // 실시간 현황판인 경우 STEP 3, 4 숨김
            if (step3Box) step3Box.style.display = 'none';
            if (step4Box) step4Box.style.display = 'none';
            
            // 필수 속성 제거
            document.getElementById('detailContent')?.removeAttribute('required');
            
            // 급여 형태 라디오 버튼 필수 해제
            const salaryRadios = document.querySelectorAll('input[name="salaryType"]');
            salaryRadios.forEach(radio => radio.removeAttribute('required'));
            
            // 급여 필수 해제
            document.getElementById('salary')?.removeAttribute('required');
        } else {
            // 다른 광고 타입인 경우 STEP 3, 4 표시
            if (step3Box) step3Box.style.display = 'block';
            if (step4Box) step4Box.style.display = 'block';
            
            // 필수 속성 추가
            document.getElementById('detailContent')?.setAttribute('required', 'required');
            
            // 급여 형태 라디오 버튼 필수 설정
            const salaryRadios = document.querySelectorAll('input[name="salaryType"]');
            salaryRadios.forEach(radio => radio.setAttribute('required', 'required'));
            
            // 급여 필수 설정
            document.getElementById('salary')?.setAttribute('required', 'required');
        }
    }
    
    // 기업회원 정보로 폼 자동 채우기 (읽기 전용 필드)
    if (userData) {
        const businessName2 = document.getElementById('businessName2');
        const contactName2 = document.getElementById('contactName2');
        const contactPhone2 = document.getElementById('contactPhone2');
        const businessType = document.getElementById('businessType');
        
        if (businessName2 && userData.storeName) businessName2.value = userData.storeName;
        if (contactName2 && userData.name) contactName2.value = userData.name;
        if (contactPhone2 && userData.phone) contactPhone2.value = userData.phone;
        if (businessType && userData.businessType) businessType.value = userData.businessType;
    }
    
    // 먼저 region1 옵션을 로드
    try {
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        const region1Select = document.getElementById('region1');
        if (region1Select) {
            // 기존 옵션 제거 (첫 번째 옵션 제외)
            while (region1Select.options.length > 1) {
                region1Select.remove(1);
            }
            
            // region1 옵션 추가
            region1Data.regions.forEach(region => {
                const option = new Option(region.name, region.name);
                option.setAttribute('data-code', region.code);
                region1Select.add(option);
            });
            
            // 회원정보에서 region1, region2 설정
            if (userData && userData.region1) {
                // region1 값 설정
                region1Select.value = userData.region1;
                
                // region2 옵션 로드 후 값 설정
                const selectedRegion = region1Data.regions.find(r => r.name === userData.region1);
                if (selectedRegion) {
                    // region2 데이터 로드
                    const region2Response = await fetch('/data/region2.json');
                    const region2Data = await region2Response.json();
                    
                    const region2Select = document.getElementById('region2');
                    
                    // 기존 옵션 제거
                    region2Select.innerHTML = '<option value="">시/군/구를 선택하세요</option>';
                    
                    // 선택된 region1에 해당하는 region2 옵션 추가
                    const cities = region2Data[selectedRegion.code];
                    if (cities) {
                        cities.forEach(city => {
                            const option = new Option(city, city);
                            region2Select.add(option);
                        });
                    }
                    
                    // region2 값 설정
                    if (userData.region2) {
                        region2Select.value = userData.region2;
                    }
                }
            }
            
            // 지역 선택 비활성화 (읽기 전용) - userData가 있고 region1이 있을 때만
            if (userData && userData.region1) {
                region1Select.disabled = true;
                document.getElementById('region2').disabled = true;
            }
        }
    } catch (error) {
        console.error('지역 데이터 로드 오류:', error);
    }
    
    // 커스텀 날짜 선택기 초기화 - 제거됨
    
    // 첫 번째 근무시간 시간 옵션 초기화
    const startHour = document.querySelector('.start-hour');
    const endHour = document.querySelector('.end-hour');
    
    if (startHour && endHour) {
        // 기존 옵션 제거 (첫 번째 옵션 제외)
        while (startHour.options.length > 1) {
            startHour.remove(1);
        }
        while (endHour.options.length > 1) {
            endHour.remove(1);
        }
        
        for (let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0');
            
            const startOption = document.createElement('option');
            startOption.value = `${hour}시`;
            startOption.textContent = `${hour}시`;
            startHour.appendChild(startOption);
            
            const endOption = document.createElement('option');
            endOption.value = `${hour}시`;
            endOption.textContent = `${hour}시`;
            endHour.appendChild(endOption);
        }
    }
    
    // 금액 업데이트
    updateJobAdAmount(adPrice);
    
    // 선택한 광고명 표시
    const selectedAdName = document.getElementById('selectedAdName');
    if (selectedAdName && selectedAdType) {
        selectedAdName.textContent = selectedAdType.name;
    }
    
    // 복지 버튼 클릭 이벤트 추가
    const welfareBtns = document.querySelectorAll('.welfare-btn');
    welfareBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });
    
    // 광고 기간 버튼 초기화
    initDurationButtons(adPrice);
    
    // 이미지 업로드 이벤트 초기화
    initImageUploadEvents();
}

// 이미지 업로드 이벤트 초기화
function initImageUploadEvents() {
    // 이미지 제작 의뢰 체크박스 이벤트
    const imageCreationCheckbox = document.getElementById('imageCreationRequest');
    if (imageCreationCheckbox) {
        imageCreationCheckbox.addEventListener('change', function(e) {
            const uploadAreaWrapper = document.getElementById('uploadAreaWrapper');
            const detailImagesInput = document.getElementById('detailImages');
            const uploadText = document.querySelector('.upload-text');
            const totalAmountElement = document.getElementById('totalAmount2');
            const monthlyAmount = parseInt(document.getElementById('monthlyAmount2')?.textContent.replace(/[^0-9]/g, '')) || 0;
            const duration = parseInt(document.getElementById('duration2')?.value) || 0;
            const imageCreationFeeRow = document.getElementById('imageCreationFeeRow');
            
            if (e.target.checked) {
                // 제작 의뢰 선택 시 업로드 영역 숨기기
                if (uploadAreaWrapper) {
                    uploadAreaWrapper.style.display = 'none';
                }
                
                // 이미지 파일 초기화
                if (detailImagesInput) {
                    detailImagesInput.value = '';
                    const preview = document.getElementById('detailImagesPreview');
                    if (preview) preview.innerHTML = '';
                    if (uploadText) uploadText.textContent = '선택된 파일 없음';
                }
                
                // 상세 페이지 행 표시
                if (imageCreationFeeRow) {
                    imageCreationFeeRow.style.display = 'flex';
                }
                
                // 총 금액에 제작비 추가 (VAT 10% 포함)
                const subTotal = (monthlyAmount * duration) + 50000;
                const totalWithCreation = Math.round(subTotal * 1.1);
                if (totalAmountElement) {
                    totalAmountElement.textContent = totalWithCreation.toLocaleString() + '원';
                }
            } else {
                // 제작 의뢰 해제 시 업로드 영역 표시
                if (uploadAreaWrapper) {
                    uploadAreaWrapper.style.display = 'block';
                }
                
                // 상세 페이지 행 숨기기
                if (imageCreationFeeRow) {
                    imageCreationFeeRow.style.display = 'none';
                }
                
                // 원래 금액으로 복원 (VAT 10% 포함)
                const subTotal = monthlyAmount * duration;
                const originalTotal = Math.round(subTotal * 1.1);
                if (totalAmountElement) {
                    totalAmountElement.textContent = originalTotal.toLocaleString() + '원';
                }
            }
        });
    }

    // 상세 이미지 유효성 검사 및 미리보기
    const detailImagesInput = document.getElementById('detailImages');
    if (detailImagesInput) {
        detailImagesInput.addEventListener('change', function(e) {
            const files = e.target.files;
            const preview = document.getElementById('detailImagesPreview');
            const imageCreationCheckbox = document.getElementById('imageCreationRequest');
            const uploadText = document.querySelector('.upload-text');
            
            console.log('이미지 파일 선택됨:', files.length); // 디버깅용
            
            if (files.length > 5) {
                alert('상세 이미지는 최대 5장까지 업로드 가능합니다.');
                e.target.value = '';
                return;
            }
            
            // 기존 미리보기에 추가하는 방식으로 변경
            if (!preview) return;
            
            // 현재 미리보기 개수 확인
            const currentPreviews = preview.querySelectorAll('.preview-item').length;
            
            // 파일 선택 텍스트 업데이트
            if (uploadText) {
                if (files.length > 0) {
                    uploadText.textContent = `${files.length}개 파일 선택됨`;
                } else {
                    uploadText.textContent = '선택된 파일 없음';
                }
            }
            
            // 이미지가 선택되면 제작 의뢰 체크 해제
            if (files.length > 0 && imageCreationCheckbox) {
                imageCreationCheckbox.checked = false;
                const uploadAreaWrapper = document.getElementById('uploadAreaWrapper');
                if (uploadAreaWrapper) {
                    uploadAreaWrapper.style.display = 'block';
                }
            }
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                if (file.size > 5 * 1024 * 1024) {
                    alert('이미지 파일은 5MB 이하만 업로드 가능합니다.');
                    e.target.value = '';
                    if (uploadText) uploadText.textContent = '선택된 파일 없음';
                    return;
                }
                
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    alert('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF)');
                    e.target.value = '';
                    if (uploadText) uploadText.textContent = '선택된 파일 없음';
                    return;
                }
                
                // 미리보기 추가 (기존 미리보기는 유지)
                if (preview) {
                    const reader = new FileReader();
                    const currentIndex = currentPreviews + i; // 기존 미리보기 개수에 현재 인덱스 추가
                    reader.onload = function(e) {
                        const previewItem = document.createElement('div');
                        previewItem.className = 'preview-item';
                        previewItem.innerHTML = `
                            <img src="${e.target.result}" alt="상세 이미지 ${currentIndex + 1}">
                            <button type="button" class="preview-remove" onclick="removePreviewImage(${currentIndex})">×</button>
                        `;
                        preview.appendChild(previewItem);
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }
}

// region2 옵션 업데이트 함수
function updateRegion2OptionsForJob(region1Code) {
    const region2Select = document.getElementById('region2');
    
    // 기존 옵션 제거
    region2Select.innerHTML = '<option value="">시/군/구를 선택하세요</option>';
    
    if (!region1Code || !window.region2Data) return;
    
    // 선택된 region1에 해당하는 region2 옵션 추가
    const cities = window.region2Data[region1Code];
    if (cities) {
        cities.forEach(city => {
            const option = new Option(city, city);
            region2Select.add(option);
        });
    }
}

// 채용관 광고 금액 업데이트
export function updateJobAdAmount(adPrice) {
    const duration = parseInt(document.getElementById('duration2')?.value) || 0;
    const imageCreationCheckbox = document.getElementById('imageCreationRequest');
    const imageCreationFee = (imageCreationCheckbox?.checked) ? 50000 : 0;
    const subTotal = (adPrice * duration) + imageCreationFee;
    const totalPrice = Math.round(subTotal * 1.1); // VAT 10% 포함
    
    const monthlyAmount2 = document.getElementById('monthlyAmount2');
    const adDuration2 = document.getElementById('adDuration2');
    const totalAmount2 = document.getElementById('totalAmount2');
    
    if (monthlyAmount2) monthlyAmount2.textContent = adPrice.toLocaleString() + '원';
    if (adDuration2) adDuration2.textContent = duration > 0 ? duration + '개월' : '-';
    if (totalAmount2) totalAmount2.textContent = totalPrice.toLocaleString() + '원';
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
            // 로딩 표시
            showLoading();
            
            // business_users 컬렉션에서 현재 사용자 정보 가져오기
            const userDoc = await getDoc(doc(db, 'business_users', currentUser.uid));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            // 소셜 연락처 맵 형태로 수집
            const socialContact = {
                kakao: document.getElementById('kakaoContact')?.value.trim() || '',
                telegram: document.getElementById('telegramContact')?.value.trim() || '',
                line: document.getElementById('lineContact')?.value.trim() || '',
                wechat: document.getElementById('wechatContact')?.value.trim() || ''
            };
            
            // 급여 정보 수집 (실시간 현황판이 아닌 경우에만)
            let salaryType = '';
            let salary = '';
            let workTimes = [];
            let welfareList = [];
            
            if (selectedAdType?.type !== 'realtime') {
                salaryType = document.querySelector('input[name="salaryType"]:checked')?.value || '';
                salary = document.getElementById('salary')?.value.trim() || '';
                
                // 근무 시간 데이터 수집
                const workTimeItems = document.querySelectorAll('.work-time-item');
                workTimeItems.forEach(item => {
                    const title = item.querySelector('.time-title')?.value.trim();
                    const startTime = item.querySelector('.start-hour')?.value;
                    const endTime = item.querySelector('.end-hour')?.value;
                    
                    if (title && startTime && endTime) {
                        workTimes.push({
                            title: title,
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                });
                
                if (workTimes.length === 0) {
                    alert('최소 하나의 근무 시간을 입력해주세요.');
                    hideLoading();
                    return;
                }
                
                // 복지 데이터 수집
                const welfareBtns = document.querySelectorAll('.welfare-btn.active');
                welfareList = Array.from(welfareBtns).map(btn => btn.getAttribute('data-value'));
            }
            
            // 기본 폼 데이터 준비 - storeCode와 userNickname 추가
            const formData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                adType: selectedAdType?.type || '',
                adCategory: 'job',
                adName: selectedAdType?.name || '',
                businessName: document.getElementById('businessName2')?.value.trim() || '',
                businessType: document.getElementById('businessType')?.value.trim() || '',
                contactName: document.getElementById('contactName2')?.value.trim() || '',
                contactPhone: document.getElementById('contactPhone2')?.value.trim() || '',
                socialContact: socialContact,
                workRegion1: document.getElementById('region1')?.value || '',
                workRegion2: document.getElementById('region2')?.value || '',
                salaryType: salaryType,
                salary: salary,
                workTimes: workTimes,
                welfare: welfareList,
                startDate: null, // 관리자가 나중에 설정
                duration: parseInt(document.getElementById('duration2')?.value) || 0,
                monthlyAmount: adPrice,
                totalAmount: Math.round(((adPrice * (parseInt(document.getElementById('duration2')?.value) || 0)) + (document.getElementById('imageCreationRequest')?.checked ? 50000 : 0)) * 1.1),
                status: 'pending',
                storeCode: userData?.storeCode || null,  // storeCode 추가
                userNickname: userData?.nickname || '',  // userNickname 추가
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 이미지 제작 의뢰 체크 확인
            const imageCreationRequest = document.getElementById('imageCreationRequest')?.checked || false;
            
            // 이미지 파일 처리
            const detailImages = document.getElementById('detailImages')?.files;
            
            // STEP 4 데이터 (실시간 현황판이 아닌 경우에만)
            if (selectedAdType?.type !== 'realtime') {
                // 이미지가 없고 제작 의뢰도 선택하지 않은 경우
                if ((!detailImages || detailImages.length === 0) && !imageCreationRequest) {
                    alert('상세 이미지를 업로드하거나 이미지 제작 의뢰를 선택해주세요.');
                    hideLoading();
                    return;
                }
                
                formData.detailContent = document.getElementById('detailContent')?.value.trim() || '';
                formData.imageCreationRequest = imageCreationRequest;
                
                if (imageCreationRequest) {
                    formData.imageCreationFee = 50000;
                }
            }
            
            // 임시 문서 ID 생성 (이미지 업로드용)
            const tempDocId = `${currentUser.uid}_${Date.now()}`;
            
            // 이미지 업로드 처리 (실시간 현황판이 아닌 경우에만)
            if (detailImages && detailImages.length > 0 && selectedAdType?.type !== 'realtime') {
                const detailImageUrls = [];
                
                for (let i = 0; i < detailImages.length; i++) {
                    const file = detailImages[i];
                    const detailRef = ref(storage, `ad_requests_job/${currentUser.uid}/${tempDocId}/${Date.now()}_detail_${i}_${file.name}`);
                    const detailSnapshot = await uploadBytes(detailRef, file);
                    const detailUrl = await getDownloadURL(detailSnapshot.ref);
                    detailImageUrls.push(detailUrl);
                }
                
                // 이미지 정보를 formData에 추가
                formData.detailImageUrls = detailImageUrls;
                formData.hasDetailImages = true;
                formData.detailImagesCount = detailImages.length;
            }
            
            // 최종적으로 한 번에 DB에 저장
            const docRef = await addDoc(collection(db, 'ad_requests_job'), formData);
            
            // 로딩 숨김
            hideLoading();
            
            // 팝업 JS 동적 로드 및 표시
            if (!window.showAdCompletePopup) {
                const script = document.createElement('script');
                script.src = '/advertise/js/ad-completed-popup.js';
                script.onload = () => {
                    window.showAdCompletePopup();
                };
                document.body.appendChild(script);
            } else {
                window.showAdCompletePopup();
            }
            
        } catch (error) {
            console.error('광고 신청 오류:', error);
            alert('광고 신청 중 오류가 발생했습니다.');
        } finally {
            // 로딩 숨김
            hideLoading();
        }
    });
}

// 광고 기간 버튼 초기화
function initDurationButtons(adPrice) {
    const durationBtns = document.querySelectorAll('.duration-btn');
    const hiddenDuration = document.getElementById('duration2');
    
    durationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 다른 버튼 비활성화
            durationBtns.forEach(b => b.classList.remove('active'));
            // 현재 버튼 활성화
            this.classList.add('active');
            // 값 설정
            const duration = this.getAttribute('data-value');
            hiddenDuration.value = duration;
            // 금액 업데이트
            updateJobAdAmount(adPrice);
        });
    });
}