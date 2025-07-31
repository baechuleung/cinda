// 파일경로: /main/js/main.js
// 파일이름: main.js

import { auth } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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
    // 인증 상태 확인
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 로그인한 사용자
            console.log('로그인한 사용자:', user.email);
            document.body.style.display = 'block';
            
            // 헤더 로드
            window.loadHeader('header-container');
            
            // 페이지 기능 초기화
            initializePage();
        } else {
            // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
            window.location.href = '/login.html';
        }
    });
});

// 페이지 초기화 함수
function initializePage() {
    // 구인광고 바로가기 버튼
    const recruitmentBtn = document.querySelector('.recruitment .card-button');
    if (recruitmentBtn) {
        recruitmentBtn.addEventListener('click', function() {
            window.location.href = '/job/job-list.html';
        });
    }
    
    // 반타원타 바로가기 버튼
    const vantaBtn = document.querySelector('.vanta .card-button');
    if (vantaBtn) {
        vantaBtn.addEventListener('click', function() {
            // TC계산기 Pro 모드로 이동
            window.location.href = '/tc-calculate/simple-tc.html';
        });
    }
    
    // 제휴서비스 바로가기 버튼
    const partnershipBtn = document.querySelector('.partnership .card-button');
    if (partnershipBtn) {
        partnershipBtn.addEventListener('click', function() {
            // 제휴서비스 페이지로 이동
            window.location.href = '/partner/partner-list.html';
        });
    }
    
    // 오늘의 운세 바로가기 버튼
    const fortuneBtn = document.querySelector('.fortune .card-button');
    if (fortuneBtn) {
        fortuneBtn.addEventListener('click', function() {
            // 오늘의 운세 페이지로 이동
            window.location.href = '/fortune/fortune.html';
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