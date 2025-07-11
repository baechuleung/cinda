import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// 가게 코드 생성 함수 (한글 그대로 사용, 업종 포함)
async function generateStoreCode(storeName, region1, region2, businessType) {
    // 1. 기본 키 생성 (한글 그대로 사용, 업종 포함)
    const baseKey = `${storeName}_${businessType}_${region1}_${region2}`;
    
    // 2. store_codes 컬렉션에서 기존 코드들 조회
    const masterDoc = await getDoc(doc(db, 'store_codes', 'master'));
    const codes = masterDoc.exists() ? (masterDoc.data().codes || {}) : {};
    
    // 3. 같은 패턴의 코드들 찾아서 최대 번호 찾기
    let maxNumber = 0;
    Object.keys(codes).forEach(code => {
        if (code.startsWith(baseKey)) {
            const parts = code.split('_');
            const number = parseInt(parts[parts.length - 1]);
            if (!isNaN(number)) {
                maxNumber = Math.max(maxNumber, number);
            }
        }
    });
    
    // 4. 다음 번호로 코드 생성
    const nextNumber = maxNumber + 1;
    const storeCode = `${baseKey}_${String(nextNumber).padStart(3, '0')}`;
    
    return storeCode;
}

// 폼 제출 처리
document.getElementById('addStoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        // 폼 데이터 먼저 수집
        const storeName = document.getElementById('storeName').value.trim();
        const region1 = document.getElementById('region1').value;
        const region2 = document.getElementById('region2').value;
        const businessType = document.getElementById('businessType').value;
        
        // 트랜잭션 밖에서 코드 생성
        const storeCode = await generateStoreCode(storeName, region1, region2, businessType);
        console.log('생성된 가게 코드:', storeCode);
        
        // 트랜잭션으로 처리 (코드 중복 방지)
        await runTransaction(db, async (transaction) => {
            // 1. 먼저 모든 읽기 작업 수행
            const masterRef = doc(db, 'store_codes', 'master');
            const masterDoc = await transaction.get(masterRef);
            
            // 2. 읽기 완료 후 쓰기 작업 시작
            // 가게 정보 준비
            const formData = {
                storeName: storeName,
                region1: region1,
                region2: region2,
                businessType: businessType,
                status: document.getElementById('status').value,
                isOpen: document.getElementById('isOpen').value === 'true',
                availableRooms: parseInt(document.getElementById('availableRooms').value) || 0,
                availablePeople: parseInt(document.getElementById('availablePeople').value) || 0,
                waitingCustomers: parseInt(document.getElementById('waitingCustomers').value) || 0,
                isActive: true,
                storeCode: storeCode, // 가게 코드 추가
                registeredAt: serverTimestamp(),
                lastUpdate: serverTimestamp()
            };
            
            // 채팅방 ID 생성
            const timestamp = Date.now();
            formData.chatRoomId = `${formData.storeName}_${formData.region2}_${timestamp}`;
            
            // 3. realtime-status 컬렉션에 저장
            const newStoreRef = doc(collection(db, 'realtime-status'));
            transaction.set(newStoreRef, formData);
            
            // 4. store_codes 컬렉션 업데이트
            const currentCodes = masterDoc.exists() ? (masterDoc.data().codes || {}) : {};
            
            // 새 코드 추가
            currentCodes[storeCode] = {
                storeId: newStoreRef.id,
                storeName: storeName,
                region1: region1,
                region2: region2,
                businessType: businessType,
                createdAt: new Date().toISOString(),
                isActive: true
            };
            
            if (masterDoc.exists()) {
                transaction.update(masterRef, { codes: currentCodes });
            } else {
                transaction.set(masterRef, { codes: currentCodes });
            }
        });
        
        alert('가게가 성공적으로 추가되었습니다.');
        window.location.href = 'list.html';
        
    } catch (error) {
        console.error('가게 추가 오류:', error);
        alert('가게 추가 중 오류가 발생했습니다: ' + error.message);
    }
});