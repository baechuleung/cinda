import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
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
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 사용자 프로필 업데이트
        await updateProfile(user, {
            displayName: name
        });
        
        // Firestore의 individual_users 컬렉션에 사용자 정보 저장
        await setDoc(doc(db, 'individual_users', user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            phone: phone,
            userType: 'individual',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log('개인회원 가입 성공 및 Firestore 저장 완료');
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