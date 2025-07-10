// 메인 초기화 및 필터/검색 기능
import { initializeChatPopup } from './realtime-chat-popup.js';
import { initializeInquiryPopup } from './realtime-inquiry-popup.js';
import { db } from '/js/firebase-config.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allStores = [];
let unsubscribe = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료');
    
    // 실시간 데이터 구독 시작
    subscribeToStores();
    
    // 이벤트 리스너는 데이터 로드 후에 설정하도록 수정
    setTimeout(() => {
        // 필터 초기화
        initializeFilters();
        
        // 채팅 팝업 초기화
        initializeChatPopup();
        
        // 문의 팝업 초기화
        initializeInquiryPopup();
        
        // 시간 업데이트
        initializeTime();
        
        // 지역 검색 이벤트 리스너 추가
        document.addEventListener('locationSearch', handleLocationSearch);
    }, 1000);
});

// Firestore 실시간 리스너 설정
function subscribeToStores() {
    try {
        // 실시간 리스너 설정
        unsubscribe = onSnapshot(collection(db, 'realtime-status'), (snapshot) => {
            allStores = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                // 클라이언트 측에서 필터링
                if (data.isActive && data.isOpen) {
                    allStores.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            // 가게명으로 정렬
            allStores.sort((a, b) => a.storeName.localeCompare(b.storeName));
            
            console.log('실시간 데이터 업데이트:', allStores.length + '개 가게');
            
            // 처음에는 전체 표시
            displayStores(allStores);
        }, (error) => {
            console.error('실시간 데이터 구독 오류:', error);
        });
    } catch (error) {
        console.error('리스너 설정 오류:', error);
    }
}

// 날짜 포맷 함수
function formatUpdateTime(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes} 기준`;
}

// 가게 카드 표시
function displayStores(stores) {
    const statusGrid = document.querySelector('.status-grid');
    
    if (!statusGrid) {
        console.error('status-grid를 찾을 수 없습니다');
        return;
    }
    
    if (!stores || stores.length === 0) {
        statusGrid.innerHTML = '<div class="no-data" style="text-align: center; padding: 2rem; color: #999;">표시할 가게가 없습니다.</div>';
        return;
    }
    
    // 즐겨찾기 목록 가져오기
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // 즐겨찾기된 가게와 일반 가게 분리
    const favoriteStores = [];
    const normalStores = [];
    
    stores.forEach(store => {
        if (favorites.includes(store.id)) {
            favoriteStores.push(store);
        } else {
            normalStores.push(store);
        }
    });
    
    // 즐겨찾기 가게를 먼저, 그 다음 일반 가게 표시
    const sortedStores = [...favoriteStores, ...normalStores];
    
    statusGrid.innerHTML = sortedStores.map(store => `
        <div class="status-card ${store.status}">
            <div class="card-header">
                <div class="card-info">
                    <div class="location-row">
                        <span class="location">${store.storeName} - ${store.businessType}</span>
                        <span class="badge ${store.status}">${getStatusText(store.status)}</span>
                    </div>
                    <span class="update-time">${formatUpdateTime(store.lastUpdate)}</span>
                </div>
                <button class="favorite-btn ${favorites.includes(store.id) ? 'active' : ''}" data-store-id="${store.id}" onclick="toggleFavorite('${store.id}')">
                    <span class="star">${favorites.includes(store.id) ? '★' : '☆'}</span>
                </button>
            </div>
            <div class="card-stats">
                <div class="stat">
                    <div class="number">${store.availableRooms || 0}</div>
                    <div class="label">맞출 방수</div>
                </div>
                <div class="stat">
                    <div class="number">${store.availablePeople || 0}</div>
                    <div class="label">맞출 인원</div>
                </div>
                <div class="stat">
                    <div class="number">${store.waitingCustomers || 0}</div>
                    <div class="label">대기 손님</div>
                </div>
            </div>
            <div class="card-actions">
                <button class="action-btn chat" data-store-id="${store.id}" data-chat-id="${store.chatRoomId}">채팅하기</button>
                <button class="action-btn inquiry" data-store-id="${store.id}">문의하기</button>
            </div>
        </div>
    `).join('');
    
    // 이벤트 리스너 재설정
    initializeChatPopup();
    initializeInquiryPopup();
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

// 필터 기능
function initializeFilters() {
    const filterInputs = document.querySelectorAll('input[name="filter"]');
    console.log('필터 인풋 개수:', filterInputs.length);
    
    filterInputs.forEach(input => {
        input.addEventListener('change', function() {
            console.log('필터 변경:', this.value);
            
            // 상태 필터만 적용
            applyStatusFilter();
        });
    });
}

// 상태 필터 적용
function applyStatusFilter() {
    const checkedFilter = document.querySelector('input[name="filter"]:checked');
    const statusFilter = checkedFilter ? checkedFilter.value : 'all';
    
    // 검색 필터가 적용된 경우 해당 결과에서 필터링, 아니면 전체에서 필터링
    let baseStores = window.searchFilteredStores || allStores;
    let filteredStores = [...baseStores];
    
    console.log('상태 필터 적용 - 상태:', statusFilter, '기본 가게 수:', baseStores.length);
    
    // 상태 필터 적용
    if (statusFilter !== 'all') {
        filteredStores = filteredStores.filter(store => {
            switch(statusFilter) {
                case 'available':
                    return store.status === 'green';
                case 'normal':
                    return store.status === 'orange';
                case 'busy':
                    return store.status === 'red';
                default:
                    return true;
            }
        });
    }
    
    console.log('상태 필터링 결과:', filteredStores.length + '개');
    displayStores(filteredStores);
}

// 지역 검색 핸들러
function handleLocationSearch(event) {
    const searchParams = event.detail;
    console.log('지역 검색 파라미터:', searchParams);
    
    let filteredStores = [...allStores];
    
    // 업종 필터
    if (searchParams.businessType) {
        filteredStores = filteredStores.filter(store => 
            store.businessType === searchParams.businessType
        );
    }
    
    // 지역1 필터
    if (searchParams.region1) {
        filteredStores = filteredStores.filter(store => 
            store.region1 === searchParams.region1
        );
    }
    
    // 지역2 필터
    if (searchParams.region2) {
        filteredStores = filteredStores.filter(store => 
            store.region2 === searchParams.region2
        );
    }
    
    // 매장명 필터
    if (searchParams.storeName) {
        const searchTerm = searchParams.storeName.toLowerCase();
        filteredStores = filteredStores.filter(store => 
            store.storeName.toLowerCase().includes(searchTerm)
        );
    }
    
    console.log('검색 필터링 결과:', filteredStores.length + '개');
    
    // 검색 결과를 저장 (상태 필터와 독립적으로 동작하도록)
    window.searchFilteredStores = filteredStores;
    
    // 현재 상태 필터 적용
    applyStatusFilter();
}

// 시간 업데이트
function initializeTime() {
    function updateTime() {
        const dateTime = document.querySelector('.date-time');
        if (dateTime) {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            dateTime.textContent = `오늘 ${hours}:${minutes} 기준`;
        }
    }
    
    updateTime();
    setInterval(updateTime, 60000);
}

// 즐겨찾기 토글 함수
window.toggleFavorite = function(storeId) {
    const btn = document.querySelector(`button[data-store-id="${storeId}"]`);
    const star = btn.querySelector('.star');
    
    // 로컬스토리지에서 즐겨찾기 목록 가져오기
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    if (favorites.includes(storeId)) {
        // 즐겨찾기 제거
        favorites = favorites.filter(id => id !== storeId);
        star.textContent = '☆';
        btn.classList.remove('active');
    } else {
        // 즐겨찾기 추가
        favorites.push(storeId);
        star.textContent = '★';
        btn.classList.add('active');
    }
    
    // 로컬스토리지 업데이트
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // 현재 필터/검색 상태 유지하면서 다시 표시
    if (window.searchFilteredStores) {
        applyStatusFilter();
    } else {
        const checkedFilter = document.querySelector('input[name="filter"]:checked');
        const statusFilter = checkedFilter ? checkedFilter.value : 'all';
        applyStatusFilter();
    }
};

// 페이지 언로드 시 리스너 해제
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
    // 이벤트 리스너 제거
    document.removeEventListener('locationSearch', handleLocationSearch);
});