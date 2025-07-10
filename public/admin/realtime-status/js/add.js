import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let region2Data = null;

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
    
    // 지역 데이터 로드
    await loadRegionData();
});

// 지역 데이터 로드 함수
async function loadRegionData() {
    try {
        // region1 데이터 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        const region1Select = document.getElementById('region1');
        if (region1Select) {
            region1Data.regions.forEach(region => {
                const option = new Option(region.name, region.name);
                option.setAttribute('data-code', region.code);
                region1Select.add(option);
            });
        }
        
        // region2 데이터 로드
        const region2Response = await fetch('/data/region2.json');
        region2Data = await region2Response.json();
        
        // region1 변경 이벤트 리스너
        region1Select.addEventListener('change', function() {
            updateRegion2Options(this.selectedOptions[0]?.getAttribute('data-code'));
        });
        
    } catch (error) {
        console.error('지역 데이터 로드 오류:', error);
    }
}

// region2 옵션 업데이트 함수
function updateRegion2Options(region1Code) {
    const region2Select = document.getElementById('region2');
    
    // 기존 옵션 제거
    region2Select.innerHTML = '<option value="">도시를 선택하세요</option>';
    
    if (!region1Code || !region2Data) return;
    
    // 선택된 region1에 해당하는 region2 옵션 추가
    const cities = region2Data[region1Code];
    if (cities) {
        cities.forEach(city => {
            const option = new Option(city, city);
            region2Select.add(option);
        });
    }
}

// 폼 제출 처리
document.getElementById('addStoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        // 폼 데이터 수집
        const formData = {
            storeName: document.getElementById('storeName').value.trim(),
            region1: document.getElementById('region1').value,
            region2: document.getElementById('region2').value,
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