// 파일 경로: /public/auth/js/register-individual.js
// 파일 이름: register-individual.js

import { auth, db } from '../../js/firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 드롭다운 초기화
function initDropdowns() {
    const emailDropdownSelected = document.getElementById('emailDropdownSelected');
    const emailDropdownMenu = document.getElementById('emailDropdownMenu');
    const emailDropdownOptions = document.querySelectorAll('#emailDropdownOptions .dropdown-option');

    // 이메일 드롭다운 토글
    emailDropdownSelected.addEventListener('click', function() {
        const isOpen = emailDropdownMenu.style.display === 'block';
        emailDropdownMenu.style.display = isOpen ? 'none' : 'block';
        this.classList.toggle('active', !isOpen);
    });

    // 이메일 옵션 선택
    emailDropdownOptions.forEach(option => {
        option.addEventListener('click', function() {
            const value = this.dataset.value;
            const text = this.textContent;
            
            // 모든 옵션에서 selected 클래스 제거
            emailDropdownOptions.forEach(opt => opt.classList.remove('selected'));
            // 현재 선택한 옵션에 selected 클래스 추가
            this.classList.add('selected');
            
            if (value) {
                emailDropdownSelected.querySelector('.selected-text').textContent = text;
            }
            
            emailDropdownMenu.style.display = 'none';
            emailDropdownSelected.classList.remove('active');
            updateEmail();
        });
    });

    // 외부 클릭시 드롭다운 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            emailDropdownMenu.style.display = 'none';
            emailDropdownSelected.classList.remove('active');
        }
    });
}

// 이메일 업데이트
function updateEmail() {
    const emailId = document.getElementById('emailId').value;
    const selectedOption = document.querySelector('#emailDropdownOptions .dropdown-option.selected');
    
    let domain = '';
    
    if (selectedOption) {
        const selectedDomain = selectedOption.dataset.value;
        if (selectedDomain) {
            domain = selectedDomain;
        }
    }
    
    if (emailId && domain) {
        document.getElementById('email').value = `${emailId}@${domain}`;
    } else if (emailId) {
        document.getElementById('email').value = emailId;
    }
}

// 이메일 입력 이벤트
document.getElementById('emailId').addEventListener('input', updateEmail);

// 비밀번호 유효성 검사
function validatePassword(password) {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasLength = password.length >= 8 && password.length <= 20;
    
    return hasLetter && hasNumber && hasSpecial && hasLength;
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
    
    const terms1 = document.getElementById('terms1').checked;
    const terms2 = document.getElementById('terms2').checked;
    const terms3 = document.getElementById('terms3').checked;
    
    const errorMessage = document.getElementById('error-message');
    
    // 유효성 검사
    if (!email || !email.includes('@')) {
        errorMessage.textContent = '올바른 이메일 주소를 입력해주세요.';
        return;
    }
    
    if (!validatePassword(password)) {
        errorMessage.textContent = '비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.';
        return;
    }
    
    if (password !== confirmPassword) {
        errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
        return;
    }
    
    if (!nickname) {
        errorMessage.textContent = '닉네임을 입력해주세요.';
        return;
    }
    
    if (!terms1 || !terms2) {
        errorMessage.textContent = '필수 약관에 모두 동의해주세요.';
        return;
    }
    
    try {
        // Firebase Auth로 사용자 생성
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 프로필 업데이트
        await updateProfile(user, {
            displayName: nickname
        });
        
        // Firestore의 users 컬렉션에 여성회원 정보 저장
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: email,
            nickname: nickname,
            name: name,
            birthdate: birthdate,
            phone: phone,
            gender: 'female',
            userType: 'individual',
            marketingAgree: terms3,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        // 성공 시 리다이렉트
        alert('회원가입이 완료되었습니다.');
        window.location.href = '/main/main.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage.textContent = '이미 사용 중인 이메일입니다.';
                break;
            case 'auth/weak-password':
                errorMessage.textContent = '비밀번호가 너무 약합니다.';
                break;
            case 'auth/invalid-email':
                errorMessage.textContent = '유효하지 않은 이메일 형식입니다.';
                break;
            default:
                errorMessage.textContent = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
        }
    }
});

// 페이지 로드 시 드롭다운 초기화
document.addEventListener('DOMContentLoaded', initDropdowns);