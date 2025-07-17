// 파일 경로: /advertise/js/ad-form-general.js
// 파일이름: ad-form-general.js

import { db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// 현재 업로드된 파일들을 추적하는 전역 배열
let currentFiles = [];
let thumbnailFile = null;

// 썸네일 업로드 이벤트 초기화
function initThumbnailUploadEvents() {
    const thumbnailInput = document.getElementById('thumbnailImage');
    const thumbnailText = document.getElementById('thumbnailText');
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    
    if (thumbnailInput) {
        thumbnailInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (!file) {
                thumbnailFile = null;
                if (thumbnailText) thumbnailText.textContent = '선택된 파일 없음';
                if (thumbnailPreview) thumbnailPreview.innerHTML = '';
                return;
            }
            
            // 파일 크기 검사
            if (file.size > 5 * 1024 * 1024) {
                alert('이미지 파일은 5MB 이하만 업로드 가능합니다.');
                e.target.value = '';
                return;
            }
            
            // 파일 타입 검사
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF)');
                e.target.value = '';
                return;
            }
            
            thumbnailFile = file;
            if (thumbnailText) thumbnailText.textContent = file.name;
            
            // 썸네일 미리보기
            if (thumbnailPreview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    thumbnailPreview.innerHTML = `
                        <div class="preview-item">
                            <img src="${e.target.result}" alt="썸네일 이미지">
                            <button type="button" class="preview-remove" onclick="removeThumbnail()">×</button>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// 썸네일 제거 함수
window.removeThumbnail = function() {
    thumbnailFile = null;
    const thumbnailInput = document.getElementById('thumbnailImage');
    const thumbnailText = document.getElementById('thumbnailText');
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    
    if (thumbnailInput) thumbnailInput.value = '';
    if (thumbnailText) thumbnailText.textContent = '선택된 파일 없음';
    if (thumbnailPreview) thumbnailPreview.innerHTML = '';
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

// 일반 광고 폼 초기화
export function initGeneralAdForm(userData, selectedAdType, adPrice) {
    // 파일 배열 초기화
    currentFiles = [];
    
    // removePreviewImage 함수를 여기서 전역으로 등록
    window.removePreviewImage = function(index) {
        const preview = document.getElementById('adImagesPreview');
        const uploadText = document.querySelector('.upload-text');
        
        if (preview && currentFiles.length > index) {
            // 배열에서 파일 제거
            currentFiles.splice(index, 1);
            
            // 미리보기 다시 렌더링
            renderPreview();
            
            // 텍스트 업데이트
            if (uploadText) {
                if (currentFiles.length > 0) {
                    uploadText.textContent = `${currentFiles.length}개 파일 선택됨`;
                } else {
                    uploadText.textContent = '선택된 파일 없음';
                }
            }
        }
    };
    
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
        const businessType1 = document.getElementById('businessType1');
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
        
        // 업종 (partnerCategory)
        if (businessType1 && userData.partnerCategory) {
            businessType1.value = userData.partnerCategory;
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
    
    // 커스텀 날짜 선택기 초기화
    initCustomDatePicker();
    
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
    
    // 썸네일 업로드 이벤트 초기화
    initThumbnailUploadEvents();
    
    // 이미지 제작 의뢰 체크박스 이벤트
    const imageCreationCheckbox = document.getElementById('imageCreationRequest1');
    if (imageCreationCheckbox) {
        imageCreationCheckbox.addEventListener('change', function() {
            // 금액 업데이트
            updateGeneralAdAmount(adPrice);
            
            // 파일 업로드 영역 숨김/표시
            const uploadAreaWrapper = document.getElementById('uploadAreaWrapper');
            const imageCreationFeeRow = document.getElementById('imageCreationFeeRow');
            
            if (uploadAreaWrapper) {
                if (this.checked) {
                    uploadAreaWrapper.style.display = 'none';
                    // 기존에 선택된 파일들 초기화
                    currentFiles = [];
                    const adImagesInput = document.getElementById('adImages1');
                    const adImagesPreview = document.getElementById('adImagesPreview');
                    const uploadText = document.querySelector('.upload-text');
                    
                    if (adImagesInput) adImagesInput.value = '';
                    if (adImagesPreview) adImagesPreview.innerHTML = '';
                    if (uploadText) uploadText.textContent = '선택된 파일 없음';
                } else {
                    uploadAreaWrapper.style.display = 'block';
                }
            }
            
            // 이미지 제작비 행 표시/숨김
            if (imageCreationFeeRow) {
                imageCreationFeeRow.style.display = this.checked ? 'flex' : 'none';
            }
        });
    }
    
    // 초기 금액 표시
    updateGeneralAdAmount(adPrice);
}

// 미리보기 렌더링 함수
function renderPreview() {
    const adImagesPreview = document.getElementById('adImagesPreview');
    if (!adImagesPreview) return;
    
    adImagesPreview.innerHTML = '';
    currentFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="광고 이미지 ${index + 1}">
                <button type="button" class="preview-remove" onclick="removePreviewImage(${index})">×</button>
            `;
            adImagesPreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// 이미지 업로드 이벤트 초기화
function initImageUploadEvents() {
    const adImagesInput = document.getElementById('adImages1');
    const uploadText = document.querySelector('.upload-text');
    
    if (adImagesInput) {
        adImagesInput.addEventListener('change', function(e) {
            const newFiles = Array.from(e.target.files);
            
            // 새 파일들 추가 (최대 5장 체크)
            for (let file of newFiles) {
                if (currentFiles.length >= 5) {
                    alert('광고 이미지는 최대 5장까지 업로드 가능합니다.');
                    break;
                }
                
                // 파일 크기 검사
                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name}: 이미지 파일은 5MB 이하만 업로드 가능합니다.`);
                    continue;
                }
                
                // 파일 타입 검사
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    alert(`${file.name}: 이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF)`);
                    continue;
                }
                
                // 중복 파일 체크
                const isDuplicate = currentFiles.some(f => 
                    f.name === file.name && f.size === file.size
                );
                
                if (!isDuplicate) {
                    currentFiles.push(file);
                }
            }
            
            // 파일 선택 텍스트 업데이트
            if (uploadText) {
                if (currentFiles.length > 0) {
                    uploadText.textContent = `${currentFiles.length}개 파일 선택됨`;
                } else {
                    uploadText.textContent = '이미지를 선택하세요';
                }
            }
            
            // 미리보기 렌더링
            renderPreview();
            
            // input 값 초기화 (같은 파일 다시 선택 가능하도록)
            e.target.value = '';
        });
    }
}

// 금액 업데이트
export function updateGeneralAdAmount(adPrice) {
    const duration = parseInt(document.getElementById('duration1')?.value) || 0;
    const imageCreationCheckbox = document.getElementById('imageCreationRequest1');
    const imageCreationFee = (imageCreationCheckbox?.checked) ? 50000 : 0;
    const subTotal = (adPrice * duration) + imageCreationFee;
    const totalPrice = Math.round(subTotal * 1.1); // VAT 10% 포함
    
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
        
        // 필수 입력 항목 확인
        const businessAddress = document.getElementById('businessAddress1')?.value.trim();
        const businessHours = document.getElementById('businessHours1')?.value.trim();
        
        if (!businessAddress) {
            alert('업체 주소를 입력해주세요.');
            return;
        }
        
        if (!businessHours) {
            alert('영업시간을 입력해주세요.');
            return;
        }
        
        // 썸네일 이미지 확인
        if (!thumbnailFile) {
            alert('업체 대표 이미지를 업로드해주세요.');
            return;
        }
        
        // 이미지 확인 (이미지 제작 의뢰를 체크한 경우는 이미지 필수 아님)
        const imageCreationChecked = document.getElementById('imageCreationRequest1')?.checked;
        if (!imageCreationChecked && currentFiles.length === 0) {
            alert('광고 이미지를 업로드하거나 이미지 제작 의뢰를 선택해주세요.');
            return;
        }
        
        try {
            // 로딩 표시
            showLoading();
            
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
                businessType: document.getElementById('businessType1')?.value.trim() || userData?.partnerCategory || '',
                contactName: document.getElementById('contactName1')?.value.trim() || '',
                contactPhone: document.getElementById('contactPhone1')?.value.trim() || '',
                contactEmail: document.getElementById('contactEmail1')?.value.trim() || '',
                businessAddress: document.getElementById('businessAddress1')?.value.trim() || '',
                kakaoContact: document.getElementById('kakaoContact1')?.value.trim() || '',
                businessWebsite: document.getElementById('businessWebsite1')?.value.trim() || '',
                targetUrl: document.getElementById('businessWebsite1')?.value.trim() || '', // 홈페이지 주소를 연결 URL로도 사용
                businessHours: document.getElementById('businessHours1')?.value.trim() || '',
                detailContent: document.getElementById('detailContent1')?.value.trim() || '',
                imageCreationRequest: document.getElementById('imageCreationRequest1')?.checked || false,
                startDate: document.getElementById('startDate1')?.value || '',
                duration: parseInt(duration) || 0,
                monthlyAmount: adPrice,
                totalAmount: Math.round(((adPrice * (parseInt(duration) || 0)) + (document.getElementById('imageCreationRequest1')?.checked ? 50000 : 0)) * 1.1),
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 임시 문서 ID 생성 (이미지 업로드용)
            const tempDocId = `${currentUser.uid}_${Date.now()}`;
            
            // 썸네일 업로드 처리
            let thumbnailUrl = '';
            if (thumbnailFile) {
                const thumbnailFileName = `ad_requests_general/${currentUser.uid}/${tempDocId}/thumbnail_${thumbnailFile.name}`;
                const thumbnailRef = ref(storage, thumbnailFileName);
                const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailFile);
                thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
            }
            
            // 상세 이미지 업로드 처리
            const imageUrls = [];
            for (let i = 0; i < currentFiles.length; i++) {
                const file = currentFiles[i];
                const fileName = `ad_requests_general/${currentUser.uid}/${tempDocId}/${Date.now()}_${i}_${file.name}`;
                const storageRef = ref(storage, fileName);
                
                const snapshot = await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(snapshot.ref);
                imageUrls.push(downloadUrl);
            }
            
            // 이미지 정보를 formData에 추가
            formData.thumbnailUrl = thumbnailUrl;
            formData.adImages = imageUrls;
            formData.hasImages = true;
            formData.imagesCount = currentFiles.length;
            
            // 최종적으로 한 번에 DB에 저장
            const docRef = await addDoc(collection(db, 'ad_requests_general'), formData);
            
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
            alert('광고 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            // 로딩 숨김
            hideLoading();
        }
    });
}

// 취소 버튼
window.cancelAdForm = function() {
    if (confirm('광고 신청을 취소하시겠습니까?')) {
        window.location.href = '/advertise/html/ad-add.html';
    }
}

// 커스텀 날짜 선택기 함수
function initCustomDatePicker() {
    const dateDisplay = document.getElementById('startDate1Display');
    const calendarDropdown = document.getElementById('calendarDropdown');
    const hiddenDateInput = document.getElementById('startDate1');
    
    if (!dateDisplay || !calendarDropdown) return;
    
    let currentDate = new Date();
    let selectedDate = null;
    
    // 날짜 표시 클릭 시 캘린더 토글
    dateDisplay.addEventListener('click', function(e) {
        e.stopPropagation();
        calendarDropdown.classList.toggle('show');
        
        // 화면 위치에 따라 캘린더 위치 조정
        const rect = dateDisplay.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        if (spaceBelow < 350 && spaceAbove > 350) {
            // 아래 공간이 부족하면 위로 표시
            calendarDropdown.style.bottom = '100%';
            calendarDropdown.style.top = 'auto';
            calendarDropdown.style.marginBottom = '0.5rem';
            calendarDropdown.style.marginTop = '0';
        } else {
            // 기본: 아래로 표시
            calendarDropdown.style.top = '100%';
            calendarDropdown.style.bottom = 'auto';
            calendarDropdown.style.marginTop = '0.5rem';
            calendarDropdown.style.marginBottom = '0';
        }
        
        renderCalendar();
    });
    
    // 캘린더 렌더링
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // 월 표시
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        const monthYearElement = document.querySelector('.cal-month-year');
        if (monthYearElement) {
            monthYearElement.textContent = `${year}년 ${monthNames[month]}`;
        }
        
        // 날짜 그리기
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const calDates = document.querySelector('.cal-dates');
        if (!calDates) return;
        
        calDates.innerHTML = '';
        
        // 빈 칸
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            calDates.appendChild(emptyDiv);
        }
        
        // 날짜
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateDiv = document.createElement('div');
            dateDiv.className = 'cal-date';
            
            if (date < today) {
                dateDiv.classList.add('disabled');
            }
            
            if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
                dateDiv.classList.add('selected');
            }
            
            dateDiv.setAttribute('data-date', `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
            dateDiv.textContent = day;
            
            if (!dateDiv.classList.contains('disabled')) {
                dateDiv.addEventListener('click', selectDate);
            }
            
            calDates.appendChild(dateDiv);
        }
    }
    
    // 날짜 선택
    function selectDate(e) {
        const dateStr = e.target.getAttribute('data-date');
        selectedDate = new Date(dateStr);
        
        // 표시 업데이트
        const [year, month, day] = dateStr.split('-');
        dateDisplay.value = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
        hiddenDateInput.value = dateStr;
        
        // 캘린더 닫기
        calendarDropdown.classList.remove('show');
    }
    
    // 이전/다음 달 버튼
    const prevBtn = document.querySelector('.cal-prev-btn');
    const nextBtn = document.querySelector('.cal-next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // 외부 클릭 시 캘린더 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-date-picker')) {
            calendarDropdown.classList.remove('show');
        }
    });
}