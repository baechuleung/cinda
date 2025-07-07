import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 폼 데이터 가져오기
    const email = document.getElementById('email').value; // hidden input의 조합된 이메일
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const nickname = document.getElementById('nickname').value;
    const name = document.getElementById('name').value;
    const birthdate = document.getElementById('birthdate').value;
    const phone = document.getElementById('phone').value;
    const businessType = document.getElementById('businessType').value;
    const storeName = document.getElementById('storeName').value;
    
    // 약관 동의 확인
    const terms1 = document.getElementById('terms1').checked;
    const terms2 = document.getElementById('terms2').checked;
    
    const errorMessage = document.getElementById('error-message');
    
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
        await setDoc(doc(db, 'business_users', user.uid), {
            uid: user.uid,
            email: email,
            nickname: nickname,
            name: name,
            birthdate: birthdate,
            phone: phone,
            businessType: businessType,
            storeName: storeName || '',
            userType: 'business',
            marketingAgreed: document.getElementById('terms3').checked,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
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