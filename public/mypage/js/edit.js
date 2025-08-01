// 파일경로: mypage/js/edit.js
// 파일이름: edit.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let currentUserType = null;

// 사용자 정보 표시
async function displayUserInfo(user) {
    if (!user) return;
    
    try {
        // Firestore에서 사용자 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData) {
            currentUserType = userData.userType;
            
            // 닉네임/회사명 표시 및 입력 필드에 설정
            const profileName = document.querySelector('.profile-name');
            const nicknameInput = document.getElementById('nickname');
            const nicknameLabel = document.querySelector('label[for="nickname"]');
            
            if (userData.userType === 'partner') {
                // 제휴업체인 경우
                if (profileName) {
                    profileName.textContent = userData.companyName || '제휴업체';
                }
                if (nicknameInput) {
                    nicknameInput.value = userData.companyName || '';
                }
                if (nicknameLabel) {
                    nicknameLabel.textContent = '회사명';
                }
            } else {
                // 일반회원 또는 기업회원인 경우
                if (profileName) {
                    profileName.textContent = userData.nickname || '사용자';
                }
                if (nicknameInput) {
                    nicknameInput.value = userData.nickname || '';
                }
            }
            
            // 회원 상태 표시
            const profileStatus = document.querySelector('.profile-status');
            if (profileStatus && userData.userType) {
                const userTypeDisplayText = {
                    'individual': '여성회원',
                    'partner': '파트너회원',
                    'business': '기업회원'
                };
                profileStatus.textContent = userTypeDisplayText[userData.userType] || '여성회원';
                profileStatus.setAttribute('data-type', userData.userType);
            }
        }
    } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
    }
}

// 폼 제출 처리
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const nickname = document.getElementById('nickname').value.trim();
    const newPassword = document.getElementById('birthdate').value;
    const confirmPassword = document.getElementById('password-confirm').value;
    
    // 닉네임/회사명 검증
    if (!nickname) {
        alert(currentUserType === 'partner' ? '회사명을 입력해주세요.' : '닉네임을 입력해주세요.');
        return;
    }
    
    // 비밀번호 변경을 원하는 경우
    if (newPassword || confirmPassword) {
        // 비밀번호 일치 확인
        if (newPassword !== confirmPassword) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        
        // 비밀번호 형식 검증
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/;
        if (!passwordRegex.test(newPassword)) {
            alert('비밀번호는 영문, 숫자, 특수문자가 모두 포함된 8~20자여야 합니다.');
            return;
        }
    }
    
    try {
        // 닉네임/회사명 업데이트
        const updateData = {
            updatedAt: new Date()
        };
        
        if (currentUserType === 'partner') {
            updateData.companyName = nickname;
        } else {
            updateData.nickname = nickname;
        }
        
        await updateDoc(doc(db, 'users', currentUser.uid), updateData);
        
        // 비밀번호 업데이트 (입력된 경우)
        if (newPassword) {
            await updatePassword(currentUser, newPassword);
        }
        
        alert('회원정보가 성공적으로 수정되었습니다.');
        
        // 비밀번호 필드 초기화
        document.getElementById('birthdate').value = '';
        document.getElementById('password-confirm').value = '';
        
        // 프로필 이름 업데이트
        const profileName = document.querySelector('.profile-name');
        if (profileName) {
            profileName.textContent = nickname;
        }
        
    } catch (error) {
        console.error('회원정보 수정 오류:', error);
        
        if (error.code === 'auth/requires-recent-login') {
            alert('보안을 위해 다시 로그인해주세요.');
            window.location.href = '/auth/login.html';
        } else {
            alert('회원정보 수정 중 오류가 발생했습니다.');
        }
    }
}

// 페이지 초기화
function initializePage() {
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', handleFormSubmit);
    }
}

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        displayUserInfo(user);
        initializePage();
    } else {
        // 로그인하지 않은 경우 로그인 페이지로 이동
        alert('로그인이 필요합니다.');
        window.location.href = '/auth/login.html';
    }
});