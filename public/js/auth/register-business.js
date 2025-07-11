import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allStores = [];
let selectedStoreData = null;

// 페이지 로드 시 가게 목록 가져오기
document.addEventListener('DOMContentLoaded', async () => {
    await loadStoreList();
    
    // 새로운 UI 이벤트 설정
    setupStoreSelectUI();
});

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
                    code: code, // 키가 코드 (예: "달리는 토끼_하이퍼블릭_서울_강남구_001")
                    ...storeData,
                    displayName: `${storeData.storeName}_${storeData.region1}_${storeData.region2}`
                }));
            
            console.log('필터링된 가게 목록:', allStores);
            
            // 표시 이름으로 정렬
            allStores.sort((a, b) => a.displayName.localeCompare(b.displayName));
            
            console.log('가게 목록 로드 완료:', allStores.length + '개');
            
            // 초기 표시 - DOM이 준비된 후에만 실행
            if (document.getElementById('storeList')) {
                filterAndDisplayStores();
            }
        } else {
            console.log('master 문서가 존재하지 않습니다.');
        }
    } catch (error) {
        console.error('가게 목록 로드 오류:', error);
        console.error('오류 상세:', error.message);
    }
}

// 새로운 UI 설정
function setupStoreSelectUI() {
    const searchInput = document.getElementById('storeSearchInput');
    const dropdownToggle = document.getElementById('dropdownToggle');
    const storeDropdown = document.getElementById('storeDropdown');
    
    if (!searchInput || !dropdownToggle || !storeDropdown) {
        console.error('UI 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 드롭다운 토글
    dropdownToggle.addEventListener('click', () => {
        const isOpen = storeDropdown.style.display !== 'none';
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    // 검색 입력
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterAndDisplayStores(searchTerm);
        if (storeDropdown.style.display === 'none') {
            openDropdown();
        }
    });
    
    // 포커스 시 드롭다운 열기
    searchInput.addEventListener('focus', () => {
        openDropdown();
    });
    
    // 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.store-select-container')) {
            closeDropdown();
        }
    });
    
    // 직접 입력 선택 이벤트
    const specialItem = document.querySelector('.special-item');
    if (specialItem) {
        specialItem.addEventListener('click', () => {
            window.selectStore('none');
        });
    }
    
    function openDropdown() {
        storeDropdown.style.display = 'block';
        dropdownToggle.classList.add('active');
        filterAndDisplayStores(searchInput.value);
    }
    
    function closeDropdown() {
        storeDropdown.style.display = 'none';
        dropdownToggle.classList.remove('active');
    }
}

// 가게 목록 표시 (새로운 UI)
function filterAndDisplayStores(searchTerm = '') {
    const storeList = document.getElementById('storeList');
    const searchResultCount = document.getElementById('searchResultCount');
    
    if (!storeList || !searchResultCount) {
        console.error('DOM 요소를 찾을 수 없습니다.');
        return;
    }
    
    let filteredStores = allStores;
    
    if (searchTerm) {
        filteredStores = allStores.filter(store => 
            store.storeName.toLowerCase().includes(searchTerm) ||
            store.region1.toLowerCase().includes(searchTerm) ||
            store.region2.toLowerCase().includes(searchTerm) ||
            store.businessType.toLowerCase().includes(searchTerm)
        );
    }
    
    searchResultCount.textContent = filteredStores.length;
    
    storeList.innerHTML = filteredStores.map(store => `
        <div class="store-item" onclick="selectStore('${store.code}')">
            <div class="store-name">${store.storeName}</div>
            <div class="store-info">
                <span class="store-badge">${store.businessType}</span>
                <span>${store.region1} ${store.region2}</span>
            </div>
        </div>
    `).join('');
    
    if (filteredStores.length === 0) {
        storeList.innerHTML = `
            <div class="dropdown-item" style="text-align: center; color: #999;">
                검색 결과가 없습니다
            </div>
        `;
    }
}

// 가게 선택 (전역 함수)
window.selectStore = function(storeCode) {
    const searchInput = document.getElementById('storeSearchInput');
    const storeSelect = document.getElementById('storeSelect');
    const businessTypeSelect = document.getElementById('businessType');
    const storeNameGroup = document.querySelector('.store-name-group');
    const storeNameInput = document.getElementById('storeName');
    
    if (storeCode === 'none') {
        // 직접 입력 선택
        searchInput.value = '직접 입력';
        storeSelect.value = 'none';
        storeNameGroup.style.display = 'block';
        storeNameInput.required = true;
        businessTypeSelect.disabled = false;
        businessTypeSelect.value = '';
        selectedStoreData = null;
    } else {
        // 가게 선택
        selectedStoreData = allStores.find(store => store.code === storeCode);
        if (selectedStoreData) {
            searchInput.value = `${selectedStoreData.storeName} (${selectedStoreData.region1} ${selectedStoreData.region2})`;
            storeSelect.value = storeCode;
            businessTypeSelect.value = selectedStoreData.businessType;
            businessTypeSelect.disabled = true;
            storeNameGroup.style.display = 'none';
            storeNameInput.required = false;
        }
    }
    
    // 드롭다운 닫기
    document.getElementById('storeDropdown').style.display = 'none';
    document.getElementById('dropdownToggle').classList.remove('active');
};

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
        window.location.href = '../../dashboard.html';
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
    const select = document.getElementById('emailDomainSelect');
    const directInput = document.getElementById('emailDomainDirect');
    const emailField = document.getElementById('email');
    
    if (select.value === 'direct') {
        directInput.style.display = 'block';
        select.style.display = 'none';
        directInput.focus();
        
        if (emailId && directInput.value) {
            emailField.value = emailId + '@' + directInput.value;
        }
    } else if (select.value) {
        if (emailId) {
            emailField.value = emailId + '@' + select.value;
        }
    }
}

// 전역 함수로 등록
window.updateEmailField = updateEmailField;