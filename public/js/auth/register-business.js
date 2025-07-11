import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allStores = [];
let filteredStores = [];
let selectedStoreData = null;
let businessTypes = [];
let filteredBusinessTypes = [];

// 이메일 도메인 목록
const emailDomains = [
    { value: 'naver.com', text: 'naver.com' },
    { value: 'gmail.com', text: 'gmail.com' },
    { value: 'daum.net', text: 'daum.net' },
    { value: 'hanmail.net', text: 'hanmail.net' }
];

// 드롭다운 옵션 업데이트 함수들을 먼저 정의
function updateDropdownOptions(stores) {
    const dropdownOptions = document.getElementById('dropdownOptions');
    
    // 기본 옵션 유지하고 나머지 제거
    const defaultOptions = dropdownOptions.querySelectorAll('.dropdown-option:nth-child(1), .dropdown-option:nth-child(2)');
    dropdownOptions.innerHTML = '';
    defaultOptions.forEach(opt => dropdownOptions.appendChild(opt));
    
    if (stores.length === 0) {
        const noResultsOption = document.createElement('div');
        noResultsOption.className = 'dropdown-option no-results';
        noResultsOption.textContent = '검색 결과가 없습니다';
        dropdownOptions.appendChild(noResultsOption);
    } else {
        // 가게명으로 한글 정렬 (ㄱㄴㄷ 순서)
        const sortedStores = [...stores].sort((a, b) => {
            return a.storeName.localeCompare(b.storeName, 'ko-KR', { 
                numeric: true,  // 숫자를 올바르게 정렬
                sensitivity: 'base'  // 대소문자 구분 안함
            });
        });
        
        sortedStores.forEach(store => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = store.code;
            option.dataset.businessType = store.businessType;
            option.textContent = store.displayName;
            dropdownOptions.appendChild(option);
        });
    }
}

function updateBusinessTypeOptions(types) {
    const dropdownOptions = document.getElementById('businessDropdownOptions');
    if (!dropdownOptions) return;
    
    dropdownOptions.innerHTML = '';
    
    // 기본 옵션 추가
    const defaultOption = document.createElement('div');
    defaultOption.className = 'dropdown-option';
    defaultOption.dataset.value = '';
    defaultOption.textContent = '업종을 선택해주세요';
    dropdownOptions.appendChild(defaultOption);
    
    if (types.length === 0) {
        const noResultsOption = document.createElement('div');
        noResultsOption.className = 'dropdown-option no-results';
        noResultsOption.textContent = '검색 결과가 없습니다';
        dropdownOptions.appendChild(noResultsOption);
    } else {
        // 업종 이름으로 한글 정렬 (ㄱㄴㄷ 순서)
        const sortedTypes = [...types].sort((a, b) => {
            return a.name.localeCompare(b.name, 'ko-KR', { 
                numeric: true,  // 숫자를 올바르게 정렬
                sensitivity: 'base'  // 대소문자 구분 안함
            });
        });
        
        sortedTypes.forEach(type => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = type.name;  // 한글명을 값으로 사용
            option.textContent = type.name;
            dropdownOptions.appendChild(option);
        });
    }
}

// 드롭다운 닫기 함수들
function closeDropdown() {
    const dropdownSelected = document.getElementById('dropdownSelected');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    dropdownSelected.classList.remove('active');
    dropdownMenu.style.display = 'none';
}

function closeBusinessDropdown() {
    const dropdownSelected = document.getElementById('businessDropdownSelected');
    const dropdownMenu = document.getElementById('businessDropdownMenu');
    
    dropdownSelected.classList.remove('active');
    dropdownMenu.style.display = 'none';
}

function closeEmailDropdown() {
    const dropdownSelected = document.getElementById('emailDropdownSelected');
    const dropdownMenu = document.getElementById('emailDropdownMenu');
    
    dropdownSelected.classList.remove('active');
    dropdownMenu.style.display = 'none';
}

// 페이지 로드 시 가게 목록 가져오기
document.addEventListener('DOMContentLoaded', async () => {
    await loadBusinessTypes();
    await loadStoreList();
    setupDropdown();
    setupBusinessTypeDropdown();
    setupEmailDropdown();
});

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        // 절대 경로 사용
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        businessTypes = data.businessTypes;
        filteredBusinessTypes = [...businessTypes];
        
        console.log('업종 목록 로드 완료:', businessTypes.length + '개');
        
        // 업종 드롭다운 옵션 업데이트
        updateBusinessTypeOptions(businessTypes);
    } catch (error) {
        console.error('업종 데이터 로드 오류:', error);
        // 오류 시 빈 배열로 설정
        businessTypes = [];
        filteredBusinessTypes = [];
        updateBusinessTypeOptions(businessTypes);
    }
}

// 가게 목록 로드
async function loadStoreList() {
    try {
        console.log('가게 목록 로드 시작...');
        
        // store_codes 컬렉션에서 master 문서 가져오기
        const masterDoc = await getDoc(doc(db, 'store_codes', 'master'));
        
        if (masterDoc.exists()) {
            const data = masterDoc.data();
            console.log('master 문서 데이터:', data);
            
            const codes = data.codes || {};
            console.log('codes 객체:', codes);
            
            // codes 객체의 각 키(가게 코드)를 순회하면서 배열로 변환
            allStores = Object.entries(codes)
                .filter(([code, storeData]) => storeData.isActive === true)
                .map(([code, storeData]) => ({
                    code: code,
                    ...storeData,
                    displayName: `${storeData.storeName} (${storeData.region1} ${storeData.region2} - ${storeData.businessType})`
                }));
            
            console.log('필터링된 가게 목록:', allStores);
            
            // 한글 정렬 (ㄱㄴㄷ 순서)
            allStores.sort((a, b) => {
                return a.storeName.localeCompare(b.storeName, 'ko-KR', { 
                    numeric: true,  // 숫자를 올바르게 정렬
                    sensitivity: 'base'  // 대소문자 구분 안함
                });
            });
            filteredStores = [...allStores];
            
            console.log('가게 목록 로드 완료:', allStores.length + '개');
            
            // 드롭다운 옵션 업데이트
            updateDropdownOptions(allStores);
        } else {
            console.log('master 문서가 존재하지 않습니다.');
        }
    } catch (error) {
        console.error('가게 목록 로드 오류:', error);
        console.error('오류 상세:', error.message);
    }
}

// 커스텀 드롭다운 설정
function setupDropdown() {
    const dropdownSelected = document.getElementById('dropdownSelected');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const dropdownSearch = document.getElementById('dropdownSearch');
    const selectedText = document.querySelector('.selected-text');
    const storeSelectInput = document.getElementById('storeSelect');
    
    // 드롭다운 토글
    dropdownSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display !== 'none';
        
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    // 검색 기능
    dropdownSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            filteredStores = [...allStores];
        } else {
            filteredStores = allStores.filter(store => 
                store.displayName.toLowerCase().includes(searchTerm) ||
                store.storeName.toLowerCase().includes(searchTerm) ||
                store.region1.toLowerCase().includes(searchTerm) ||
                store.region2.toLowerCase().includes(searchTerm) ||
                store.businessType.toLowerCase().includes(searchTerm)
            );
        }
        
        updateDropdownOptions(filteredStores);
    });
    
    // 검색창 클릭 시 이벤트 전파 방지
    dropdownSearch.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 옵션 선택 이벤트 위임
    document.getElementById('dropdownOptions').addEventListener('click', function(e) {
        const option = e.target.closest('.dropdown-option');
        if (option && !option.classList.contains('no-results')) {
            const value = option.dataset.value;
            const text = option.textContent;
            
            // 선택된 값 설정
            selectedText.textContent = text;
            storeSelectInput.value = value;
            
            // 선택 상태 업데이트
            document.querySelectorAll('.dropdown-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            
            // 가게 선택 처리
            handleStoreSelection(value);
            
            // 드롭다운 닫기
            closeDropdown();
        }
    });
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            closeDropdown();
            closeBusinessDropdown();
            closeEmailDropdown();
        }
    });
}

// 업종 드롭다운 설정
function setupBusinessTypeDropdown() {
    const dropdownSelected = document.getElementById('businessDropdownSelected');
    const dropdownMenu = document.getElementById('businessDropdownMenu');
    const dropdownSearch = document.getElementById('businessDropdownSearch');
    const selectedText = dropdownSelected.querySelector('.selected-text');
    const businessTypeInput = document.getElementById('businessType');
    
    // 드롭다운 토글
    dropdownSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display !== 'none';
        
        if (isOpen) {
            closeBusinessDropdown();
        } else {
            openBusinessDropdown();
        }
    });
    
    // 검색 기능
    dropdownSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            filteredBusinessTypes = [...businessTypes];
        } else {
            filteredBusinessTypes = businessTypes.filter(type => 
                type.name.toLowerCase().includes(searchTerm) ||
                type.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
            );
        }
        
        updateBusinessTypeOptions(filteredBusinessTypes);
    });
    
    // 검색창 클릭 시 이벤트 전파 방지
    dropdownSearch.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 옵션 선택 이벤트 위임
    document.getElementById('businessDropdownOptions').addEventListener('click', function(e) {
        const option = e.target.closest('.dropdown-option');
        if (option && !option.classList.contains('no-results')) {
            const value = option.dataset.value;
            const text = option.textContent;
            
            // 선택된 값 설정
            selectedText.textContent = text;
            businessTypeInput.value = value;
            
            // 선택 상태 업데이트
            document.querySelectorAll('#businessDropdownOptions .dropdown-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            
            // 드롭다운 닫기
            closeBusinessDropdown();
        }
    });
}

// 이메일 도메인 드롭다운 설정
function setupEmailDropdown() {
    const dropdownSelected = document.getElementById('emailDropdownSelected');
    const dropdownMenu = document.getElementById('emailDropdownMenu');
    const dropdownSearch = document.getElementById('emailDropdownSearch');
    const selectedText = dropdownSelected.querySelector('.selected-text');
    const directInput = document.getElementById('emailDomainDirect');
    const emailDomainDropdown = document.querySelector('.email-domain-dropdown');
    
    // 드롭다운 토글
    dropdownSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display !== 'none';
        
        if (isOpen) {
            closeEmailDropdown();
        } else {
            openEmailDropdown();
        }
    });
    
    // 검색 기능
    dropdownSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        updateEmailDropdownOptions(searchTerm);
    });
    
    // 검색창 클릭 시 이벤트 전파 방지
    dropdownSearch.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 옵션 선택 이벤트 위임
    document.getElementById('emailDropdownOptions').addEventListener('click', function(e) {
        const option = e.target.closest('.dropdown-option');
        if (option && !option.classList.contains('no-results')) {
            const value = option.dataset.value;
            const text = option.textContent;
            
            // 선택된 값 설정
            selectedText.textContent = text;
            
            // 선택 상태 업데이트
            document.querySelectorAll('#emailDropdownOptions .dropdown-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            
            // 직접입력 처리
            if (value === 'direct') {
                emailDomainDropdown.style.display = 'none';
                directInput.style.display = 'block';
                directInput.focus();
            } else {
                emailDomainDropdown.style.display = 'flex';
                directInput.style.display = 'none';
                directInput.value = '';
            }
            
            // 이메일 필드 업데이트
            updateEmailField();
            
            // 드롭다운 닫기
            closeEmailDropdown();
        }
    });
}

// 이메일 드롭다운 옵션 업데이트
function updateEmailDropdownOptions(searchTerm = '') {
    const dropdownOptions = document.getElementById('emailDropdownOptions');
    dropdownOptions.innerHTML = '';
    
    // 기본 옵션
    const defaultOption = document.createElement('div');
    defaultOption.className = 'dropdown-option';
    defaultOption.dataset.value = '';
    defaultOption.textContent = '도메인 선택';
    dropdownOptions.appendChild(defaultOption);
    
    // 검색어 필터링
    const filteredDomains = searchTerm 
        ? emailDomains.filter(domain => domain.text.toLowerCase().includes(searchTerm))
        : emailDomains;
    
    if (filteredDomains.length === 0 && searchTerm) {
        const noResultsOption = document.createElement('div');
        noResultsOption.className = 'dropdown-option no-results';
        noResultsOption.textContent = '검색 결과가 없습니다';
        dropdownOptions.appendChild(noResultsOption);
    } else {
        filteredDomains.forEach(domain => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = domain.value;
            option.textContent = domain.text;
            dropdownOptions.appendChild(option);
        });
        
        // 직접입력 옵션은 항상 표시
        const directOption = document.createElement('div');
        directOption.className = 'dropdown-option special';
        directOption.dataset.value = 'direct';
        directOption.textContent = '직접입력';
        dropdownOptions.appendChild(directOption);
    }
}

// 드롭다운 열기
function openDropdown() {
    const dropdownSelected = document.getElementById('dropdownSelected');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const dropdownSearch = document.getElementById('dropdownSearch');
    
    dropdownSelected.classList.add('active');
    dropdownMenu.style.display = 'block';
    
    // 검색창 초기화 및 포커스
    dropdownSearch.value = '';
    dropdownSearch.focus();
    
    // 전체 목록 표시
    filteredStores = [...allStores];
    updateDropdownOptions(filteredStores);
}

// 업종 드롭다운 열기
function openBusinessDropdown() {
    const dropdownSelected = document.getElementById('businessDropdownSelected');
    const dropdownMenu = document.getElementById('businessDropdownMenu');
    const dropdownSearch = document.getElementById('businessDropdownSearch');
    
    dropdownSelected.classList.add('active');
    dropdownMenu.style.display = 'block';
    
    // 검색창 초기화 및 포커스
    dropdownSearch.value = '';
    dropdownSearch.focus();
    
    // 전체 목록 표시
    filteredBusinessTypes = [...businessTypes];
    updateBusinessTypeOptions(filteredBusinessTypes);
}

// 이메일 드롭다운 열기
function openEmailDropdown() {
    const dropdownSelected = document.getElementById('emailDropdownSelected');
    const dropdownMenu = document.getElementById('emailDropdownMenu');
    const dropdownSearch = document.getElementById('emailDropdownSearch');
    
    dropdownSelected.classList.add('active');
    dropdownMenu.style.display = 'block';
    
    // 검색창 초기화 및 포커스
    dropdownSearch.value = '';
    dropdownSearch.focus();
    
    // 전체 옵션 표시
    updateEmailDropdownOptions();
}

// 가게 선택 처리
function handleStoreSelection(value) {
    const storeNameGroup = document.querySelector('.store-name-group');
    const storeNameInput = document.getElementById('storeName');
    const businessTypeDropdown = document.getElementById('businessTypeDropdown');
    const businessTypeInput = document.getElementById('businessType');
    const businessSelectedText = document.querySelector('#businessDropdownSelected .selected-text');
    
    if (value === 'none') {
        // '해당 가게 없음' 선택 시
        storeNameGroup.style.display = 'block';
        storeNameInput.required = true;
        businessTypeDropdown.style.pointerEvents = 'auto';
        businessTypeDropdown.style.opacity = '1';
        businessTypeInput.value = '';
        businessSelectedText.textContent = '업종을 선택해주세요';
        selectedStoreData = null;
    } else if (value) {
        // 특정 가게 선택 시
        storeNameGroup.style.display = 'none';
        storeNameInput.required = false;
        storeNameInput.value = '';
        
        // 선택된 가게 정보 찾기
        selectedStoreData = allStores.find(store => store.code === value);
        
        if (selectedStoreData) {
            // 업종 자동 설정 및 비활성화
            businessTypeInput.value = selectedStoreData.businessType;
            businessSelectedText.textContent = selectedStoreData.businessType;
            businessTypeDropdown.style.pointerEvents = 'none';
            businessTypeDropdown.style.opacity = '0.6';
            console.log('선택된 가게:', selectedStoreData);
        }
    } else {
        // 선택 안함
        storeNameGroup.style.display = 'none';
        storeNameInput.required = false;
        businessTypeDropdown.style.pointerEvents = 'auto';
        businessTypeDropdown.style.opacity = '1';
        businessTypeInput.value = '';
        businessSelectedText.textContent = '업종을 선택해주세요';
        selectedStoreData = null;
    }
}

// 폼 제출 처리
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 폼 데이터 가져오기
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const nickname = document.getElementById('nickname').value;
    const name = document.getElementById('name').value;
    const birthdate = document.getElementById('birthdate').value;
    const phone = document.getElementById('phone').value;
    const storeSelect = document.getElementById('storeSelect').value;
    const businessType = document.getElementById('businessType').value;
    
    const errorMessage = document.getElementById('error-message');
    
    // 가게명 결정
    let storeName = '';
    let storeCode = '';
    
    if (storeSelect === 'none') {
        // 직접 입력한 가게명 사용
        storeName = document.getElementById('storeName').value.trim();
        if (!storeName) {
            errorMessage.textContent = '가게명을 입력해주세요.';
            return;
        }
    } else if (selectedStoreData) {
        // 선택한 가게 정보 사용
        storeName = selectedStoreData.storeName;
        storeCode = selectedStoreData.code;
    } else {
        errorMessage.textContent = '가게를 선택해주세요.';
        return;
    }
    
    // 약관 동의 확인
    const terms1 = document.getElementById('terms1').checked;
    const terms2 = document.getElementById('terms2').checked;
    
    // 유효성 검사
    if (!email) {
        errorMessage.textContent = '이메일을 입력해주세요.';
        return;
    }
    
    if (password !== confirmPassword) {
        errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
        return;
    }
    
    if (password.length < 8) {
        errorMessage.textContent = '비밀번호는 8자 이상이어야 합니다.';
        return;
    }
    
    // 비밀번호 복잡도 검사 (영문, 숫자, 특수문자 포함)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!passwordRegex.test(password)) {
        errorMessage.textContent = '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.';
        return;
    }
    
    if (!terms1 || !terms2) {
        errorMessage.textContent = '필수 약관에 동의해주세요.';
        return;
    }
    
    if (!businessType) {
        errorMessage.textContent = '업종을 선택해주세요.';
        return;
    }
    
    try {
        // Firebase Authentication으로 사용자 생성
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 사용자 프로필 업데이트 (닉네임을 displayName으로 사용)
        await updateProfile(user, {
            displayName: nickname
        });
        
        // Firestore의 business_users 컬렉션에 사용자 정보 저장
        const userData = {
            uid: user.uid,
            email: email,
            nickname: nickname,
            name: name,
            birthdate: birthdate,
            phone: phone,
            businessType: businessType,
            storeName: storeName,
            userType: 'business',
            marketingAgreed: document.getElementById('terms3').checked,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // 가게 코드가 있으면 추가
        if (storeCode) {
            userData.storeCode = storeCode;
        }
        
        await setDoc(doc(db, 'business_users', user.uid), userData);
        
        console.log('기업회원 가입 성공 및 Firestore 저장 완료');
        window.location.href = '/realtime-status/realtime-status.html';
    } catch (error) {
        console.error('가입 오류:', error);
        if (error.code === 'auth/email-already-in-use') {
            errorMessage.textContent = '이미 사용 중인 이메일입니다.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage.textContent = '비밀번호가 너무 약합니다.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage.textContent = '유효하지 않은 이메일 형식입니다.';
        } else {
            errorMessage.textContent = '회원가입에 실패했습니다. 다시 시도해주세요.';
        }
    }
});

// 이메일 필드 업데이트 함수 추가
function updateEmailField() {
    const emailId = document.getElementById('emailId').value;
    const selectedText = document.querySelector('#emailDropdownSelected .selected-text').textContent;
    const directInput = document.getElementById('emailDomainDirect');
    const emailField = document.getElementById('email');
    
    if (selectedText === '직접입력' && directInput.value) {
        emailField.value = emailId + '@' + directInput.value;
    } else if (selectedText !== '도메인 선택' && selectedText !== '직접입력') {
        emailField.value = emailId + '@' + selectedText;
    }
}

// 전역 함수로 등록
window.updateEmailField = updateEmailField;