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
        
        // 검색 초기화
        initializeSearch();
        
        // 업종 필터 초기화
        initializeBusinessTypeFilter();
        
        // 채팅 팝업 초기화
        initializeChatPopup();
        
        // 문의 팝업 초기화
        initializeInquiryPopup();
        
        // 시간 업데이트
        initializeTime();
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
    
    statusGrid.innerHTML = stores.map(store => `
        <div class="status-card ${store.status}">
            <div class="card-header">
                <span class="location">${store.storeName} - ${store.businessType}</span>
                <span class="badge ${store.status}">${getStatusText(store.status)}</span>
                <button class="favorite-btn" data-store-id="${store.id}" onclick="toggleFavorite('${store.id}')">
                    <span class="star">☆</span>
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
    
    // 즐겨찾기 상태 복원
    restoreFavorites();
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
            
            // 필터링 실행
            const filterType = this.value;
            applyAllFilters(filterType);
        });
    });
}

// 업종 필터 기능
function initializeBusinessTypeFilter() {
    const businessTypeSelect = document.getElementById('businessTypeSelect');
    console.log('업종 선택 드롭다운:', businessTypeSelect);
    
    if (businessTypeSelect) {
        businessTypeSelect.addEventListener('change', function() {
            console.log('업종 선택:', this.value);
            applyAllFilters();
        });
    }
}

// 검색 기능
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    console.log('검색 입력:', searchInput);
    console.log('검색 버튼:', searchBtn);
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// 모든 필터 적용
function applyAllFilters(statusFilter = null) {
    // 현재 필터 상태 가져오기
    if (!statusFilter) {
        const checkedFilter = document.querySelector('input[name="filter"]:checked');
        statusFilter = checkedFilter ? checkedFilter.value : 'all';
    }
    
    const businessTypeSelect = document.getElementById('businessTypeSelect');
    const businessType = businessTypeSelect ? businessTypeSelect.value : '';
    
    let filteredStores = [...allStores];
    
    console.log('필터 적용 - 상태:', statusFilter, '업종:', businessType);
    
    // 업종 필터 적용
    if (businessType) {
        filteredStores = filteredStores.filter(store => store.businessType === businessType);
    }
    
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
    
    console.log('필터링 결과:', filteredStores.length + '개');
    displayStores(filteredStores);
}

// 검색 실행
function performSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    console.log('검색어:', searchTerm);
    
    // 현재 필터 상태 가져오기
    const checkedFilter = document.querySelector('input[name="filter"]:checked');
    const statusFilter = checkedFilter ? checkedFilter.value : 'all';
    const businessTypeSelect = document.getElementById('businessTypeSelect');
    const businessType = businessTypeSelect ? businessTypeSelect.value : '';
    
    let filteredStores = [...allStores];
    
    // 검색어 필터
    if (searchTerm) {
        filteredStores = filteredStores.filter(store => {
            const storeName = store.storeName.toLowerCase();
            const region1 = store.region1.toLowerCase();
            const region2 = store.region2.toLowerCase();
            
            return storeName.includes(searchTerm) || 
                   region1.includes(searchTerm) || 
                   region2.includes(searchTerm);
        });
    }
    
    // 업종 필터
    if (businessType) {
        filteredStores = filteredStores.filter(store => store.businessType === businessType);
    }
    
    // 상태 필터
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
    
    displayStores(filteredStores);
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
};

// 즐겨찾기 상태 복원
function restoreFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    favorites.forEach(storeId => {
        const btn = document.querySelector(`button[data-store-id="${storeId}"]`);
        if (btn) {
            const star = btn.querySelector('.star');
            star.textContent = '★';
            btn.classList.add('active');
        }
    });
}

// 페이지 언로드 시 리스너 해제
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});