import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 이메일 도메인 목록
const emailDomains = [
    { value: 'naver.com', text: 'naver.com' },
    { value: 'gmail.com', text: 'gmail.com' },
    { value: 'daum.net', text: 'daum.net' },
    { value: 'hanmail.net', text: 'hanmail.net' }
];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    setupEmailDropdown();
});

// 이메일 드롭다운 설정
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
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            closeEmailDropdown();
        }
    });
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

// 이메일 드롭다운 닫기
function closeEmailDropdown() {
    const dropdownSelected = document.getElementById('emailDropdownSelected');
    const dropdownMenu = document.getElementById('emailDropdownMenu');
    
    dropdownSelected.classList.remove('active');
    dropdownMenu.style.display = 'none';
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

// 이메일 필드 업데이트 함수
window.updateEmailField = function() {
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

// 폼 제출 처리
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const nickname = document.getElementById('nickname').value;
    const name = document.getElementById('name').value;
    const birthdate = document.getElementById('birthdate').value;
    const phone = document.getElementById('phone').value;
    const errorMessage = document.getElementById('error-message');
    
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
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 사용자 프로필 업데이트 (닉네임을 displayName으로 사용)
        await updateProfile(user, {
            displayName: nickname
        });
        
        // Firestore의 individual_users 컬렉션에 사용자 정보 저장
        await setDoc(doc(db, 'individual_users', user.uid), {
            uid: user.uid,
            email: email,
            nickname: nickname,
            name: name,
            birthdate: birthdate,
            phone: phone,
            userType: 'individual',
            marketingAgreed: document.getElementById('terms3').checked,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        console.log('개인회원 가입 성공 및 Firestore 저장 완료');
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