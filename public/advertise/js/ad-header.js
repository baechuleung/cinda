// 광고관리 공통 헤더 스크립트

// 현재 페이지에 따라 탭 활성화
function setActiveTab() {
    const currentPath = window.location.pathname;
    
    // 모든 탭 비활성화
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 현재 페이지에 해당하는 탭 활성화
    if (currentPath.includes('ad-add.html')) {
        document.getElementById('tab-add')?.classList.add('active');
    } else if (currentPath.includes('ad-list.html')) {
        document.getElementById('tab-list')?.classList.add('active');
    }
}

// 광고 헤더 로드 함수
async function loadAdHeader(containerId = 'ad-header-container') {
    try {
        // 헤더 HTML 로드
        const response = await fetch('/advertise/html/ad-header.html');
        const text = await response.text();
        
        // 헤더 내용 삽입
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = text;
            
            // 탭 활성화
            setActiveTab();
        }
        
    } catch (error) {
        console.error('광고 헤더 로딩 오류:', error);
    }
}

// DOM 로드 시 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('ad-header-container')) {
            loadAdHeader();
        }
    });
} else {
    if (document.getElementById('ad-header-container')) {
        loadAdHeader();
    }
}

// 전역 함수로 등록
window.loadAdHeader = loadAdHeader;