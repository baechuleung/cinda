// 파일경로: /main/js/main.js
// 파일이름: main.js

import { auth } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 임시 접근 제한 - 특정 UID들만 허용 (배열로 변경)
const TEMP_ALLOWED_UIDS = [
    '1o2hBje7h4cjeTFPehPrjHbfsHF2', // 첫 번째 사용자 UID
    'HS0tMiQ3IOaPoCNP0WXVxJd5UNp2',
    'NTdxyeSnCJdF324O94dloPJeIHq2' // 두 번째 사용자 UID
];

// 원본 HTML 저장 (body는 HTML에서 display:none 상태)
let originalContent = '';

// loadHeader 함수를 전역에 정의
window.loadHeader = function(containerId) {
    fetch('/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById(containerId).innerHTML = data;
            
            // 헤더 스크립트 로드
            const script = document.createElement('script');
            script.src = '/js/header.js';
            script.type = 'module';
            document.body.appendChild(script);
        })
        .catch(error => console.error('헤더 로드 실패:', error));
}

// DOM 로드 전에 실행
document.addEventListener('DOMContentLoaded', function() {
    // 원본 내용 저장
    originalContent = document.body.innerHTML;
    
    // 즉시 준비중 메시지로 변경
    document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px;color:#fff">양아치처럼 사이트 훔쳐보지 마세요!</h1>';
    document.body.style.display = 'block'; // 준비중 메시지는 보이도록
    
    // 인증 상태 확인
    onAuthStateChanged(auth, (user) => {
        if (user && TEMP_ALLOWED_UIDS.includes(user.uid)) {
            // 허용된 사용자만 원본 페이지 복원
            console.log('허용된 사용자:', user.email);
            document.body.innerHTML = originalContent;
            document.body.style.display = 'block';
            
            // 헤더 재로드
            window.loadHeader('header-container');
            
            // 푸터 재로드
            const footerScript = document.createElement('script');
            footerScript.src = '/js/footer.js';
            document.body.appendChild(footerScript);
            
            // 페이지 기능 초기화
            initializePage();
        }
        // else는 필요 없음 - 이미 준비중 메시지가 표시됨
    });
});

// 페이지 초기화 함수
function initializePage() {
    // 구인광고 바로가기 버튼
    const recruitmentBtn = document.querySelector('.recruitment .card-button');
    if (recruitmentBtn) {
        recruitmentBtn.addEventListener('click', function() {
            window.location.href = '/realtime-status/html/realtime-status.html';
        });
    }
    
    // 반타원타 바로가기 버튼
    const vantaBtn = document.querySelector('.vanta .card-button');
    if (vantaBtn) {
        vantaBtn.addEventListener('click', function() {
            // TC계산기 Pro 모드로 이동
            window.location.href = '/tc-calculate/pro-tc.html';
        });
    }
    
    // 제휴서비스 바로가기 버튼
    const partnershipBtn = document.querySelector('.partnership .card-button');
    if (partnershipBtn) {
        partnershipBtn.addEventListener('click', function() {
            // 제휴서비스 페이지로 이동
            window.location.href = '/partnership.html';
        });
    }
    
    // 오늘의 운세 바로가기 버튼
    const fortuneBtn = document.querySelector('.fortune .card-button');
    if (fortuneBtn) {
        fortuneBtn.addEventListener('click', function() {
            // 오늘의 운세 페이지로 이동
            window.location.href = '/fortune.html';
        });
    }
    
    // 카드 hover 효과
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // 페이지 표시 애니메이션
    animatePageLoad();
}

// 페이지 로드 애니메이션
function animatePageLoad() {
    // 서비스 카드 순차적 페이드인
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
}