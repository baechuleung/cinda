// 메인 초기화 및 필터/검색 기능
import { initializeChatPopup } from './realtime-chat-popup.js';
import { initializeInquiryPopup } from './realtime-inquiry-popup.js';

document.addEventListener('DOMContentLoaded', function() {
    // 필터 초기화
    initializeFilters();
    
    // 검색 초기화
    initializeSearch();
    
    // 채팅 팝업 초기화
    initializeChatPopup();
    
    // 문의 팝업 초기화
    initializeInquiryPopup();
    
    // 시간 업데이트
    initializeTime();
});

// 필터 기능
function initializeFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 활성화 상태 변경
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 필터링 실행
            const filterType = this.dataset.filter;
            filterCards(filterType);
        });
    });
}

// 카드 필터링
function filterCards(filterType) {
    const cards = document.querySelectorAll('.status-card');
    
    cards.forEach(card => {
        const badge = card.querySelector('.badge');
        const badgeText = badge ? badge.textContent : '';
        
        let shouldShow = false;
        
        switch(filterType) {
            case 'all':
                shouldShow = true;
                break;
            case 'available':
                shouldShow = badgeText === '여유' || badgeText === '초록';
                break;
            case 'normal':
                shouldShow = badgeText === '보통' || badgeText === '주황';
                break;
            case 'busy':
                shouldShow = badgeText === '혼잡' || badgeText === '빨강';
                break;
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

// 검색 기능
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
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

// 검색 실행
function performSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        // 검색어 없으면 전체 표시
        document.querySelectorAll('.status-card').forEach(card => {
            card.style.display = 'block';
        });
        return;
    }
    
    // 매장명으로 필터링
    document.querySelectorAll('.status-card').forEach(card => {
        const location = card.querySelector('.location').textContent.toLowerCase();
        card.style.display = location.includes(searchTerm) ? 'block' : 'none';
    });
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