import { auth, db } from '../../../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 관리자 권한 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요합니다.');
        window.location.href = '../../../auth/login.html';
        return;
    }
    
    // 관리자 권한 확인
    const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
    if (!adminDoc.exists() || adminDoc.data().level !== 10) {
        alert('관리자 권한이 필요합니다.');
        window.location.href = '../../../index.html';
        return;
    }
});

// 폼 제출 처리
document.getElementById('addStoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 폼 데이터 수집
    const formData = {
        storeName: document.getElementById('storeName').value.trim(),
        region1: document.getElementById('region1').value,
        region2: document.getElementById('region2').value.trim(),
        businessType: document.getElementById('businessType').value,
        businessUserId: document.getElementById('businessUserId').value.trim(),
        status: document.getElementById('status').value,
        isOpen: document.getElementById('isOpen').value === 'true',
        availableRooms: parseInt(document.getElementById('availableRooms').value) || 0,
        availablePeople: parseInt(document.getElementById('availablePeople').value) || 0,
        waitingCustomers: parseInt(document.getElementById('waitingCustomers').value) || 0,
        isActive: true,
        registeredAt: serverTimestamp(),
        lastUpdate: serverTimestamp()
    };
    
    // 채팅방 ID 생성 (storeName + region2 + timestamp)
    const timestamp = Date.now();
    formData.chatRoomId = `${formData.storeName}_${formData.region2}_${timestamp}`;
    
    try {
        // business_user 존재 확인
        const businessUserDoc = await getDoc(doc(db, 'business_users', formData.businessUserId));
        if (!businessUserDoc.exists()) {
            alert('존재하지 않는 기업회원 ID입니다.');
            return;
        }
        
        // Firestore에 저장
        const docRef = doc(collection(db, 'realtime-status'));
        await setDoc(docRef, formData);
        
        alert('가게가 성공적으로 추가되었습니다.');
        
        // 목록 페이지로 이동
        window.location.href = 'list.html';
        
    } catch (error) {
        console.error('가게 추가 오류:', error);
        alert('가게 추가 중 오류가 발생했습니다.');
    }
});