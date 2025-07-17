// 파일경로: /advertise/js/ad-complete-popup.js
// 파일이름: ad-complete-popup.js

// 팝업 열기 함수
window.showAdCompletePopup = function() {
    // 팝업 HTML 파일 로드
    fetch('/advertise/html/ad-complete-popup.html')
        .then(response => response.text())
        .then(html => {
            // 팝업이 이미 로드되어 있는지 확인
            let popup = document.getElementById('adCompletePopup');
            
            if (!popup) {
                // 팝업 CSS 로드
                if (!document.querySelector('link[href="/advertise/css/ad-complete-popup.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/advertise/css/ad-complete-popup.css';
                    document.head.appendChild(link);
                }
                
                // 팝업 HTML을 body에 추가
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                document.body.appendChild(tempDiv.firstElementChild);
                
                popup = document.getElementById('adCompletePopup');
            }
            
            // 팝업 표시
            if (popup) {
                popup.classList.add('show');
                document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
            }
        })
        .catch(error => {
            console.error('팝업 로드 오류:', error);
        });
};

// 팝업 닫기 함수
window.closeAdCompletePopup = function() {
    const popup = document.getElementById('adCompletePopup');
    if (popup) {
        popup.classList.remove('show');
        document.body.style.overflow = ''; // 배경 스크롤 복원
        
        // 광고 상태 페이지로 이동
        setTimeout(() => {
            window.location.href = '/advertise/html/ad-list.html';
        }, 300);
    }
};

// ESC 키로 팝업 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const popup = document.getElementById('adCompletePopup');
        if (popup && popup.classList.contains('show')) {
            closeAdCompletePopup();
        }
    }
});

// 팝업 외부 클릭으로 닫기
document.addEventListener('click', function(e) {
    const popup = document.getElementById('adCompletePopup');
    if (popup && e.target === popup) {
        closeAdCompletePopup();
    }
});