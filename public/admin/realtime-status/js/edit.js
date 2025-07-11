import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let storeId = null;
let region2Data = null;
let currentStoreData = null;

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
    
    // 지역 데이터 로드 후 가게 정보 로드
    await loadRegionData();
    await loadStoreData();
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
        
        // 현재 저장된 region2 값이 있다면 선택
        if (currentStoreData && currentStoreData.region2) {
            region2Select.value = currentStoreData.region2;
        }
    }
}

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
        currentStoreData = data;
        
        // 폼에 데이터 채우기
        document.getElementById('storeName').value = data.storeName || '';
        document.getElementById('region1').value = data.region1 || '';
        document.getElementById('businessType').value = data.businessType || '';
        document.getElementById('status').value = data.status || 'orange';
        document.getElementById('isOpen').value = data.isOpen ? 'true' : 'false';
        document.getElementById('isActive').value = data.isActive ? 'true' : 'false';
        document.getElementById('availableRooms').value = data.availableRooms || 0;
        document.getElementById('availablePeople').value = data.availablePeople || 0;
        document.getElementById('waitingCustomers').value = data.waitingCustomers || 0;
        
        // region1이 선택되면 region2 옵션 업데이트
        if (data.region1) {
            // region1의 code 찾기
            const region1Select = document.getElementById('region1');
            const selectedOption = region1Select.querySelector(`option[value="${data.region1}"]`);
            if (selectedOption) {
                const region1Code = selectedOption.getAttribute('data-code');
                updateRegion2Options(region1Code);
            }
        }
        
        // 정보 표시
        document.getElementById('chatRoomId').textContent = data.chatRoomId || '-';
        document.getElementById('registeredAt').textContent = formatDate(data.registeredAt);
        document.getElementById('lastUpdate').textContent = formatDate(data.lastUpdate);
        
        // 가게 코드 표시 (있을 경우)
        if (data.storeCode) {
            const storeCodeRow = document.createElement('div');
            storeCodeRow.className = 'info-row';
            storeCodeRow.innerHTML = `
                <span class="info-label">가게 코드:</span>
                <span class="info-value">${data.storeCode}</span>
            `;
            document.querySelector('.info-section').insertBefore(
                storeCodeRow, 
                document.querySelector('.info-section .info-row')
            );
        }
        
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
    
    try {
        // 폼 데이터 수집
        const formData = {
            storeName: document.getElementById('storeName').value.trim(),
            region1: document.getElementById('region1').value,
            region2: document.getElementById('region2').value,
            businessType: document.getElementById('businessType').value,
            status: document.getElementById('status').value,
            isOpen: document.getElementById('isOpen').value === 'true',
            isActive: document.getElementById('isActive').value === 'true',
            availableRooms: parseInt(document.getElementById('availableRooms').value) || 0,
            availablePeople: parseInt(document.getElementById('availablePeople').value) || 0,
            waitingCustomers: parseInt(document.getElementById('waitingCustomers').value) || 0,
            lastUpdate: serverTimestamp()
        };
        
        // Firestore 업데이트
        await updateDoc(doc(db, 'realtime-status', storeId), formData);
        
        alert('가게 정보가 수정되었습니다.');
        window.location.href = 'list.html';
        
    } catch (error) {
        console.error('가게 수정 오류:', error);
        alert('가게 수정 중 오류가 발생했습니다.');
    }
});