import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allStores = [];

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
    
    // 가게 목록 로드
    loadStores();
});

// 가게 목록 로드
async function loadStores() {
    try {
        const q = query(collection(db, 'realtime-status'), orderBy('registeredAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        allStores = [];
        querySnapshot.forEach((doc) => {
            allStores.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayStores(allStores);
    } catch (error) {
        console.error('가게 목록 로드 오류:', error);
    }
}

// 가게 목록 표시
function displayStores(stores) {
    const tbody = document.getElementById('storeList');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (stores.length === 0) {
        tbody.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    tbody.innerHTML = stores.map(store => `
        <tr>
            <td>${store.storeName}</td>
            <td>${store.region1} ${store.region2}</td>
            <td>${store.businessType}</td>
            <td>
                <span class="status-badge ${store.status}">
                    ${getStatusText(store.status)}
                </span>
            </td>
            <td>
                <span class="open-badge ${store.isOpen ? 'open' : 'closed'}">
                    ${store.isOpen ? '영업중' : '영업종료'}
                </span>
            </td>
            <td>${store.availableRooms}/${store.availablePeople}/${store.waitingCustomers}</td>
            <td>${formatDate(store.registeredAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="edit-btn" onclick="editStore('${store.id}')">수정</button>
                    <button class="delete-btn" onclick="deleteStore('${store.id}')">삭제</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 상태 텍스트 변환
function getStatusText(status) {
    const statusMap = {
        'green': '여유',
        'orange': '보통',
        'red': '혼잡'
    };
    return statusMap[status] || status;
}

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
}

// 가게 수정
window.editStore = function(storeId) {
    window.location.href = `edit.html?id=${storeId}`;
};

// 가게 삭제
window.deleteStore = async function(storeId) {
    if (!confirm('정말로 이 가게를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'realtime-status', storeId));
        alert('가게가 삭제되었습니다.');
        loadStores();
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
};

// 필터링 기능
document.getElementById('searchInput').addEventListener('input', filterStores);
document.getElementById('statusFilter').addEventListener('change', filterStores);
document.getElementById('businessTypeFilter').addEventListener('change', filterStores);

function filterStores() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const businessTypeFilter = document.getElementById('businessTypeFilter').value;
    
    const filteredStores = allStores.filter(store => {
        const matchSearch = store.storeName.toLowerCase().includes(searchTerm) ||
                          store.region1.toLowerCase().includes(searchTerm) ||
                          store.region2.toLowerCase().includes(searchTerm);
        
        const matchStatus = !statusFilter || store.status === statusFilter;
        const matchBusinessType = !businessTypeFilter || store.businessType === businessTypeFilter;
        
        return matchSearch && matchStatus && matchBusinessType;
    });
    
    displayStores(filteredStores);
}