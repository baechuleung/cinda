// Footer 관리 스크립트

// Footer 로드 함수
async function loadFooter(containerId = 'footer-container') {
    try {
        // Footer CSS가 이미 로드되었는지 확인
        const footerCSSExists = Array.from(document.styleSheets).some(sheet => 
            sheet.href && sheet.href.includes('/css/footer.css')
        );
        
        if (!footerCSSExists) {
            // Footer CSS 먼저 로드
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/footer.css';
            document.head.appendChild(link);
            
            // CSS 로드 대기
            await new Promise(resolve => {
                link.onload = resolve;
                setTimeout(resolve, 100); // 최대 100ms 대기
            });
        }
        
        // Footer HTML 로드
        const response = await fetch('/footer.html');
        const text = await response.text();
        
        // Footer 내용 삽입
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = text;
            
            // 약관 링크에 이벤트 리스너 추가
            initializeTermsLinks();
        }
        
    } catch (error) {
        console.error('Footer 로딩 오류:', error);
    }
}

// 약관 링크 초기화
function initializeTermsLinks() {
    const termsLinks = document.querySelectorAll('.footer-nav a');
    
    termsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            
            // terms 폴더의 링크만 팝업으로 열기
            if (href && href.includes('/terms/')) {
                openTermsPopup(href);
            } else {
                // 다른 링크는 일반적으로 이동
                window.location.href = href;
            }
        });
    });
}

// 약관 팝업 열기
function openTermsPopup(url) {
    // 기존 모달이 있으면 제거
    const existingModal = document.getElementById('termsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 HTML 생성
    const modalHTML = `
        <div id="termsModal" class="terms-modal">
            <div class="terms-modal-content">
                <span class="terms-modal-close">&times;</span>
                <iframe id="termsFrame" src="${url}" frameborder="0"></iframe>
            </div>
        </div>
    `;
    
    // 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 이벤트 리스너 추가
    const modal = document.getElementById('termsModal');
    const closeBtn = modal.querySelector('.terms-modal-close');
    
    // 닫기 버튼 클릭
    closeBtn.onclick = function() {
        modal.remove();
    }
    
    // 모달 외부 클릭
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    }
    
    // ESC 키로 닫기
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && document.getElementById('termsModal')) {
            document.getElementById('termsModal').remove();
        }
    });
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // footer-container가 있으면 자동 로드
        if (document.getElementById('footer-container')) {
            loadFooter();
        }
    });
} else {
    // 이미 DOM이 로드된 경우
    if (document.getElementById('footer-container')) {
        loadFooter();
    }
}

// 전역 함수로 등록
window.loadFooter = loadFooter;
window.openTermsPopup = openTermsPopup;