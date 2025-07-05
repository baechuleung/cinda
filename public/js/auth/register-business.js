import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const companyName = document.getElementById('companyName').value;
    const businessNumber = document.getElementById('businessNumber').value;
    const representative = document.getElementById('representative').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('error-message');
    
    if (password !== confirmPassword) {
        errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
        return;
    }
    
    if (password.length < 6) {
        errorMessage.textContent = '비밀번호는 6자 이상이어야 합니다.';
        return;
    }
    
    // 사업자등록번호 형식 검증 (간단한 예시)
    if (businessNumber.length !== 10) {
        errorMessage.textContent = '사업자등록번호는 10자리여야 합니다.';
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 사용자 프로필 업데이트
        await updateProfile(user, {
            displayName: companyName
        });
        
        // Firestore의 business_users 컬렉션에 사용자 정보 저장
        await setDoc(doc(db, 'business_users', user.uid), {
            uid: user.uid,
            companyName: companyName,
            businessNumber: businessNumber,
            representative: representative,
            email: email,
            phone: phone,
            userType: 'business',
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
            errorMessage.textContent = '회원가입에 실패했습니다.';
        }
    }
});