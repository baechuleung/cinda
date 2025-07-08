import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, getDoc, serverTimestamp, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
    
    // 이메일로 사업자 회원 찾기
    const businessUserEmail = document.getElementById('businessUserEmail').value.trim();
    
    try {
        console.log('이메일로 business_user 검색 시작:', businessUserEmail);
        
        // business_user 이메일로 검색
        const q = query(collection(db, 'business_users'), where('email', '==', businessUserEmail));
        const querySnapshot = await getDocs(q);
        
        console.log('검색 결과:', querySnapshot.empty ? '없음' : `${querySnapshot.size}개`);
        
        if (querySnapshot.empty) {
            alert('존재하지 않는 기업회원 이메일입니다.');
            return;
        }
        
        // 첫 번째 결과의 UID 가져오기
        const businessUserDoc = querySnapshot.docs[0];
        const businessUserId = businessUserDoc.id;
        console.log('찾은 business_user ID:', businessUserId);
        
        // 폼 데이터 수집
        const formData = {
            storeName: document.getElementById('storeName').value.trim(),
            region1: document.getElementById('region1').value,
            region2: document.getElementById('region2').value.trim(),
            businessType: document.getElementById('businessType').value,
            businessUserId: businessUserId,
            businessUserEmail: businessUserEmail, // 이메일도 저장
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
        
        // 현재 사용자 확인
        const currentUser = auth.currentUser;
        console.log('현재 인증된 사용자:', currentUser ? currentUser.uid : 'null');
        
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