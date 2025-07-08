import { auth, db } from '../../../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let storeId = null;

// URL 파라미터에서 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
storeId = urlParams.get('id');

if (!storeId) {
    alert('잘못된 접근입니다.');
    window.location.href = 'list.html';
}

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
    
    // 가게 정보 로드
    loadStoreData();
});

// 가게 정보 로드
async function loadStoreData() {
    try {
        const storeDoc = await getDoc(doc(db, 'realtime-status', storeId));
        
        if (!storeDoc.exists()) {
            alert('가게 정보를 찾을 수 없습니다.');
            window.location.href = 'list.html';
            return;
        }
        
        const data = storeDoc.data();
        
        // 폼에 데이터 채우기
        document.getElementById('storeName').value = data.storeName || '';
        document.getElementById('region1').value = data.region1 || '';
        document.getElementById('region2').value = data.region2 || '';
        document.getElementById('businessType').value = data.businessType || '';
        document.getElementById('businessUserId').value = data.businessUserId || '';
        document.getElementById('status').value = data.status || 'orange';
        document.getElementById('isOpen').value = data.isOpen ? 'true' : 'false';
        document.getElementById('isActive').value = data.isActive ? 'true' : 'false';
        document.getElementById('availableRooms').value = data.availableRooms || 0;
        document.getElementById('availablePeople').value = data.availablePeople || 0;
        document.getElementById('waitingCustomers').value = data.waitingCustomers || 0;
        
        // 정보 표시
        document.getElementById('chatRoomId').textContent = data.chatRoomId || '-';
        document.getElementById('registeredAt').textContent = formatDate(data.registeredAt);
        document.getElementById('lastUpdate').textContent = formatDate(data.lastUpdate);
        
    } catch (error) {
        console.error('가게 정보 로드 오류:', error);
        alert('가게 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ko-KR');
}

// 폼 제출 처리
document.getElementById('editStoreForm').addEventListener('submit', async (e) => {
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
        isActive: document.getElementById('isActive').value === 'true',
        availableRooms: parseInt(document.getElementById('availableRooms').value) || 0,
        availablePeople: parseInt(document.getElementById('availablePeople').value) || 0,
        waitingCustomers: parseInt(document.getElementById('waitingCustomers').value) || 0,
        lastUpdate: serverTimestamp()
    };
    
    try {
        // business_user 존재 확인
        const businessUserDoc = await getDoc(doc(db, 'business_users', formData.businessUserId));
        if (!businessUserDoc.exists()) {
            alert('존재하지 않는 기업회원 ID입니다.');
            return;
        }
        
        // Firestore 업데이트
        await updateDoc(doc(db, 'realtime-status', storeId), formData);
        
        alert('가게 정보가 수정되었습니다.');
        window.location.href = 'list.html';
        
    } catch (error) {
        console.error('가게 수정 오류:', error);
        alert('가게 수정 중 오류가 발생했습니다.');
    }
});