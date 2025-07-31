// 파일경로: /ad-business/js/ad-form.js
// 파일이름: ad-form.js

import { auth, db, storage } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

let currentUser = null;
let businessData = null;
let region2Data = null;

// 지역1 데이터 로드
async function loadRegion1() {
    try {
        const response = await fetch('/data/region1.json');
        const data = await response.json();
        const region1Options = document.getElementById('region1Options');
        
        // 지역1 옵션 추가
        data.regions.forEach(region => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = region.name; // name으로 저장
            option.textContent = region.name;
            option.addEventListener('click', function() {
                selectRegion1(region.name, region.name, region.code); // code도 전달
            });
            region1Options.appendChild(option);
        });
    } catch (error) {
        console.error('지역1 목록 로드 오류:', error);
    }
}

// 지역2 데이터 로드
async function loadRegion2Data() {
    try {
        const response = await fetch('/data/region2.json');
        region2Data = await response.json();
    } catch (error) {
        console.error('지역2 데이터 로드 오류:', error);
    }
}

// 지역1 선택 처리
function selectRegion1(value, text, code) {
    const selectedDiv = document.getElementById('region1Selected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const hiddenInput = document.getElementById('region1');
    const menu = document.getElementById('region1Menu');
    
    // 값 설정 (name으로 저장)
    selectedText.textContent = text;
    hiddenInput.value = value; // name으로 저장
    selectedDiv.classList.add('has-value');
    
    // 선택된 옵션 표시
    document.querySelectorAll('#region1Options .dropdown-option').forEach(option => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // 드롭다운 닫기
    selectedDiv.classList.remove('active');
    menu.style.display = 'none';
    
    // 지역2 초기화 및 업데이트
    resetRegion2();
    updateRegion2Options(code); // code를 사용해서 region2 업데이트
}

// 지역2 옵션 업데이트
function updateRegion2Options(region1Code) {
    const region2Options = document.getElementById('region2Options');
    region2Options.innerHTML = '';
    
    if (region2Data && region2Data[region1Code]) {
        region2Data[region1Code].forEach(region => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = region;
            option.textContent = region;
            option.addEventListener('click', function() {
                selectRegion2(region, region);
            });
            region2Options.appendChild(option);
        });
    }
}

// 지역2 초기화
function resetRegion2() {
    const selectedDiv = document.getElementById('region2Selected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const hiddenInput = document.getElementById('region2');
    
    selectedText.textContent = '지역선택';
    hiddenInput.value = '';
    selectedDiv.classList.remove('has-value');
}

// 지역2 선택 처리
function selectRegion2(value, text) {
    const selectedDiv = document.getElementById('region2Selected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const hiddenInput = document.getElementById('region2');
    const menu = document.getElementById('region2Menu');
    
    // 값 설정
    selectedText.textContent = text;
    hiddenInput.value = value;
    selectedDiv.classList.add('has-value');
    
    // 선택된 옵션 표시
    document.querySelectorAll('#region2Options .dropdown-option').forEach(option => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // 드롭다운 닫기
    selectedDiv.classList.remove('active');
    menu.style.display = 'none';
}

// 드롭다운 이벤트 리스너 설정
function setupDropdownListeners() {
    // 지역1 드롭다운
    document.getElementById('region1Selected').addEventListener('click', function() {
        toggleDropdown('region1');
    });
    
    // 지역2 드롭다운
    document.getElementById('region2Selected').addEventListener('click', function() {
        const region1Value = document.getElementById('region1').value;
        if (!region1Value) {
            alert('도시를 먼저 선택해주세요.');
            return;
        }
        toggleDropdown('region2');
    });
}

// 드롭다운 토글 함수
function toggleDropdown(dropdownId) {
    const selected = document.getElementById(`${dropdownId}Selected`);
    const menu = document.getElementById(`${dropdownId}Menu`);
    const isOpen = menu.style.display === 'block';
    
    // 모든 드롭다운 닫기
    closeAllDropdowns();
    
    if (!isOpen) {
        selected.classList.add('active');
        menu.style.display = 'block';
    }
}

// 모든 드롭다운 닫기
function closeAllDropdowns() {
    const dropdowns = ['businessType', 'region1', 'region2'];
    dropdowns.forEach(id => {
        document.getElementById(`${id}Selected`).classList.remove('active');
        document.getElementById(`${id}Menu`).style.display = 'none';
    });
}

// 업종 목록 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        const businessTypeOptions = document.getElementById('businessTypeOptions');
        
        // 업종 옵션 추가
        data.businessTypes.forEach(type => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = type.name; // name으로 저장
            option.textContent = type.name;
            option.addEventListener('click', function() {
                selectBusinessType(type.name, type.name);
            });
            businessTypeOptions.appendChild(option);
        });
        
        // 기업회원 정보가 있으면 업종 선택
        if (businessData && businessData.businessType) {
            const selectedType = data.businessTypes.find(type => type.name === businessData.businessType);
            if (selectedType) {
                selectBusinessType(selectedType.name, selectedType.name);
            }
        }
    } catch (error) {
        console.error('업종 목록 로드 오류:', error);
    }
}

// 업종 선택 처리
function selectBusinessType(value, text) {
    const selectedDiv = document.getElementById('businessTypeSelected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const hiddenInput = document.getElementById('businessType');
    const dropdown = document.getElementById('businessTypeDropdown');
    const menu = document.getElementById('businessTypeMenu');
    
    // 값 설정 (name으로 저장)
    selectedText.textContent = text;
    hiddenInput.value = value; // name으로 저장
    selectedDiv.classList.add('has-value');
    
    // 선택된 옵션 표시
    document.querySelectorAll('#businessTypeOptions .dropdown-option').forEach(option => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // 드롭다운 닫기
    selectedDiv.classList.remove('active');
    menu.style.display = 'none';
}

// 드롭다운 토글
document.getElementById('businessTypeSelected').addEventListener('click', function() {
    toggleDropdown('businessType');
});

// 외부 클릭시 드롭다운 닫기
document.addEventListener('click', function(e) {
    const dropdowns = ['businessTypeDropdown', 'region1Dropdown', 'region2Dropdown'];
    let clickedInside = false;
    
    dropdowns.forEach(id => {
        const dropdown = document.getElementById(id);
        if (dropdown && dropdown.contains(e.target)) {
            clickedInside = true;
        }
    });
    
    if (!clickedInside) {
        closeAllDropdowns();
    }
});

// 근무시간 추가 함수
window.addWorkTime = function() {
    const workTime = document.getElementById('workTime').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!workTime || !startTime || !endTime) {
        alert('모든 항목을 입력해주세요.');
        return;
    }
    
    const workTimeList = document.getElementById('workTimeList');
    const item = document.createElement('div');
    item.className = 'work-time-item';
    item.innerHTML = `
        <span class="work-time-text">${workTime} : ${startTime} ~ ${endTime}</span>
        <button type="button" class="remove-time-btn" onclick="removeWorkTime(this)">삭제</button>
    `;
    
    workTimeList.appendChild(item);
    
    // 입력 필드 초기화
    document.getElementById('workTime').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
}

// 근무시간 삭제 함수
window.removeWorkTime = function(btn) {
    btn.parentElement.remove();
}

// 태그 버튼 이벤트
document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        this.classList.toggle('active');
    });
});

// 파일 선택 이벤트
document.getElementById('businessImage').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || '선택된 파일 없음';
    // nextElementSibling의 nextElementSibling로 접근 (input -> span(버튼) -> span(파일명))
    e.target.parentElement.querySelector('.image-file-name').textContent = fileName;
});

document.getElementById('detailImage').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || '선택된 파일 없음';
    // nextElementSibling의 nextElementSibling로 접근 (input -> span(버튼) -> span(파일명))
    e.target.parentElement.querySelector('.image-file-name').textContent = fileName;
});

// 이미지 제작 의뢰 체크박스 이벤트
document.getElementById('imageCreationRequest').addEventListener('change', function() {
    const detailImageUpload = document.getElementById('detailImageUpload');
    if (this.checked) {
        detailImageUpload.classList.add('hidden');
        // 파일 선택 초기화
        document.getElementById('detailImage').value = '';
        document.querySelector('#detailImageUpload .image-file-name').textContent = '선택된 파일 없음';
    } else {
        detailImageUpload.classList.remove('hidden');
    }
});

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요합니다.');
        window.location.href = '/auth/login.html';
        return;
    }
    
    currentUser = user;
    
    // users 컬렉션에서 사용자 정보 가져오기
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().userType === 'business') {
            businessData = userDoc.data();
            // 폼에 기본 정보 자동 입력
            document.getElementById('businessName').value = businessData.businessName || '';
            document.getElementById('contactName').value = businessData.nickname || '';
            document.getElementById('contactPhone').value = businessData.businessPhone || businessData.phone || '';
            
            // 업종 목록 로드 후 선택
            await loadBusinessTypes();
            
            // 지역 데이터 로드
            await loadRegion1();
            await loadRegion2Data();
            
            // 드롭다운 이벤트 리스너 설정
            setupDropdownListeners();
        } else {
            alert('기업회원만 이용할 수 있습니다.');
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
    }
});

// 공고 기간 버튼 이벤트
document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// 가격 계산 함수
function calculatePrice() {
    const selectedDuration = document.querySelector('.duration-btn.active');
    if (!selectedDuration) return;
    
    const months = parseInt(selectedDuration.dataset.months);
    
    const basePrice = 100000;
    const totalPrice = basePrice * months;
    const vat = totalPrice * 0.1;
    const finalPrice = totalPrice + vat;    
}

// 폼 제출 이벤트
document.getElementById('adForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    try {
        // 로딩 표시
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '처리중...';
        
        // 폼 데이터 수집
        const duration = parseInt(document.querySelector('.duration-btn.active').dataset.months);
        
        const formData = {
            userId: currentUser.uid,
            businessName: document.getElementById('businessName').value,
            contactName: document.getElementById('contactName').value,
            contactPhone: document.getElementById('contactPhone').value,
            businessType: document.getElementById('businessType').value,
            adType: 'business',
            adDetailContent: document.getElementById('adDetailContent').value,
            duration: duration,
            salaryType: document.querySelector('input[name="salaryType"]:checked')?.value || '시급',
            salary: document.getElementById('salary').value,
            workTimeList: Array.from(document.querySelectorAll('.work-time-item')).map(item => 
                item.querySelector('.work-time-text').textContent
            ),
            welfare: Array.from(document.querySelectorAll('.tag-btn.active')).map(btn => btn.dataset.tag),
            region1: document.getElementById('region1').value,
            region2: document.getElementById('region2').value,
            social: {
                kakao: document.getElementById('kakaoId').value || '',
                telegram: document.getElementById('telegramId').value || ''
            },
            // 통계 데이터를 맵 형태로 구성
            statistics: {
                recommend: {
                    count: 0,
                    users: []  // 추천한 회원 uid 배열
                },
                click: {
                    count: 0,
                    users: []  // 클릭한 회원의 {uid, date} 객체 배열 (월별 리셋용)
                },
                favorite: {
                    count: 0,
                    users: []  // 즐겨찾기한 회원 uid 배열
                }
            },
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // 이미지 업로드 처리
        const businessImageFile = document.getElementById('businessImage').files[0];
        const detailImageFile = document.getElementById('detailImage').files[0];
        const imageCreationRequested = document.getElementById('imageCreationRequest').checked;
        
        // 업체 대표 이미지 업로드
        if (businessImageFile) {
            const tempDocId = `${currentUser.uid}_${Date.now()}`;
            const businessImageRef = ref(storage, `ad_business/${currentUser.uid}/${tempDocId}/business_${businessImageFile.name}`);
            const businessSnapshot = await uploadBytes(businessImageRef, businessImageFile);
            const businessImageUrl = await getDownloadURL(businessSnapshot.ref);
            
            formData.businessImageUrl = businessImageUrl;
        }
        
        // 상세페이지 이미지 업로드 (의뢰하지 않은 경우에만)
        if (!imageCreationRequested && detailImageFile) {
            const tempDocId = `${currentUser.uid}_${Date.now()}`;
            const detailImageRef = ref(storage, `ad_business/${currentUser.uid}/${tempDocId}/detail_${detailImageFile.name}`);
            const detailSnapshot = await uploadBytes(detailImageRef, detailImageFile);
            const detailImageUrl = await getDownloadURL(detailSnapshot.ref);
            
            formData.detailImageUrl = detailImageUrl;
        }
        
        // 이미지 제작 의뢰 정보 추가
        formData.imageCreationRequested = imageCreationRequested;
        
        // Firestore에 저장 - users/{userId}/ad_business 하위 컬렉션에 저장
        const userRef = doc(db, 'users', currentUser.uid);
        const docRef = await addDoc(collection(userRef, 'ad_business'), formData);
        console.log('공고 신청 완료:', docRef.id);
        
        // 팝업 표시
        document.getElementById('paymentPopup').style.display = 'flex';
        
    } catch (error) {
        console.error('공고 신청 오류:', error);
        alert('공고 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        // 버튼 복원
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '공고 신청';
    }
});

// 팝업 닫기
window.closePaymentPopup = function() {
    document.getElementById('paymentPopup').style.display = 'none';
    window.location.href = 'ad-list.html';
}

// 취소 버튼
window.cancelForm = function() {
    if (confirm('공고 신청을 취소하시겠습니까?')) {
        window.location.href = 'ad-list.html';
    }
}

// 페이지 로드시 초기 가격 계산
window.addEventListener('DOMContentLoaded', function() {
    calculatePrice();
    
    // 시간 선택기 초기화를 약간 지연시켜 DOM이 완전히 로드되도록 함
    setTimeout(() => {
        initTimePicker();
    }, 500);
});

// 시간 선택기 초기화
function initTimePicker() {
    console.log('시간 선택기 초기화 시작');
    
    // 시간 옵션 생성
    createTimeOptions();
    
    // 시간 선택기 클릭 이벤트
    const startPicker = document.getElementById('startTimePicker');
    const endPicker = document.getElementById('endTimePicker');
    
    if (startPicker) {
        startPicker.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('시작 시간 선택기 클릭');
            openTimePicker('start');
        });
    }
    
    if (endPicker) {
        endPicker.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('종료 시간 선택기 클릭');
            openTimePicker('end');
        });
    }
}

// 시간 옵션 생성
function createTimeOptions() {
    const hourOptions = document.getElementById('hourOptions');
    const minuteOptions = document.getElementById('minuteOptions');
    
    if (!hourOptions || !minuteOptions) {
        console.error('시간 선택 옵션 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    // 기존 옵션 초기화
    hourOptions.innerHTML = '';
    minuteOptions.innerHTML = '';
    
    // 시간 옵션 (00~23)
    for (let i = 0; i < 24; i++) {
        const option = document.createElement('div');
        option.className = 'time-option';
        option.dataset.value = String(i).padStart(2, '0');
        option.textContent = String(i).padStart(2, '0');
        option.addEventListener('click', function() {
            selectTimeOption(this, 'hour');
        });
        hourOptions.appendChild(option);
    }
    
    // 분 옵션 (00, 10, 20, 30, 40, 50)
    for (let i = 0; i < 60; i += 10) {
        const option = document.createElement('div');
        option.className = 'time-option';
        option.dataset.value = String(i).padStart(2, '0');
        option.textContent = String(i).padStart(2, '0');
        option.addEventListener('click', function() {
            selectTimeOption(this, 'minute');
        });
        minuteOptions.appendChild(option);
    }
}

// 시간 옵션 선택
function selectTimeOption(element, type) {
    const container = element.parentElement;
    container.querySelectorAll('.time-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
}

// 시간 선택기 열기
let currentTimeTarget = null;
function openTimePicker(target) {
    console.log('시간 선택기 열기:', target);
    currentTimeTarget = target;
    const popup = document.getElementById('timePickerPopup');
    if (!popup) {
        console.error('시간 선택 팝업을 찾을 수 없습니다.');
        return;
    }
    
    popup.style.display = 'flex';
    
    // 기존 선택 초기화
    document.querySelectorAll('.time-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // 현재 값이 있으면 선택 상태로 표시
    const currentValue = document.getElementById(target + 'Time').value;
    if (currentValue) {
        const [hour, minute] = currentValue.split(':');
        
        // 시간 선택
        const hourOption = document.querySelector(`#hourOptions .time-option[data-value="${hour}"]`);
        if (hourOption) {
            hourOption.classList.add('selected');
            setTimeout(() => hourOption.scrollIntoView({ block: 'center' }), 100);
        }
        
        // 분 선택
        const minuteOption = document.querySelector(`#minuteOptions .time-option[data-value="${minute}"]`);
        if (minuteOption) {
            minuteOption.classList.add('selected');
            setTimeout(() => minuteOption.scrollIntoView({ block: 'center' }), 100);
        }
    }
}

// window 객체에도 바인딩
window.openTimePicker = openTimePicker;

// 시간 선택기 닫기
window.closeTimePicker = function() {
    document.getElementById('timePickerPopup').style.display = 'none';
    currentTimeTarget = null;
}

// 시간 확인
window.confirmTime = function() {
    const selectedHour = document.querySelector('#hourOptions .time-option.selected');
    const selectedMinute = document.querySelector('#minuteOptions .time-option.selected');
    
    if (selectedHour && selectedMinute) {
        const time = `${selectedHour.dataset.value}:${selectedMinute.dataset.value}`;
        document.getElementById(currentTimeTarget + 'Time').value = time;
    }
    
    closeTimePicker();
}