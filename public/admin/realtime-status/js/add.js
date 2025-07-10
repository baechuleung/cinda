import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 관리자 권한 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요합니다.');
        window.location.href = '/admin/realtime-status/html/list.html';
        return;
    }
    
    // 관리자 권한 확인
    const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
    if (!adminDoc.exists() || adminDoc.data().level !== 10) {
        alert('관리자 권한이 필요합니다.');
        window.location.href = '/index.html';
        return;
    }
});

// 폼 제출 처리
document.getElementById('addStoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        // 폼 데이터 수집
        const formData = {
            storeName: document.getElementById('storeName').value.trim(),
            region1: document.getElementById('region1').value,
            region2: document.getElementById('region2').value.trim(),
            businessType: document.getElementById('businessType').value,
            status: document.getElementById('status').value,
            isOpen: document.getElementById('isOpen').value === 'true',
            availableRooms: parseInt(document.getElementById('availableRooms').value) || 0,
            availablePeople: parseInt(document.getElementById('availablePeople').value) || 0,
            waitingCustomers: parseInt(document.getElementById('waitingCustomers').value) || 0,
            isActive: true,
            registeredAt: serverTimestamp(),
            lastUpdate: serverTimestamp()
        };
        
        console.log('저장할 데이터:', formData);
        
        // 채팅방 ID 생성 (storeName + region2 + timestamp)
        const timestamp = Date.now();
        formData.chatRoomId = `${formData.storeName}_${formData.region2}_${timestamp}`;
        
        console.log('Firestore에 저장 시도...');
        
        // Firestore에 저장
        const docRef = doc(collection(db, 'realtime-status'));
        console.log('문서 참조 생성됨:', docRef.id);
        
        await setDoc(docRef, formData);
        console.log('저장 성공!');
        
        alert('가게가 성공적으로 추가되었습니다.');
        
        // 목록 페이지로 이동
        window.location.href = 'list.html';
        
    } catch (error) {
        console.error('가게 추가 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        alert('가게 추가 중 오류가 발생했습니다: ' + error.message);
    }
});