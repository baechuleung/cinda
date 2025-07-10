// 헤더 관리 스크립트
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 광고 배너 슬라이드 기능
let currentSlide = 0;
const totalSlides = 6; // 전체 배너 수
let visibleSlides = 4; // 한 번에 보이는 배너 수 (PC 기본값)
let maxSlide = totalSlides - visibleSlides;
let autoSlideInterval = null; // 자동 슬라이드 인터벌

// 모바일 체크 함수
function isMobile() {
    return window.innerWidth <= 768;
}

// 화면 크기에 따라 설정 업데이트
function updateSlideSettings() {
    if (isMobile()) {
        visibleSlides = 1; // 모바일은 1개씩
    } else {
        visibleSlides = 4; // PC는 4개씩
    }
    maxSlide = totalSlides - visibleSlides;
}

function slideAds(direction) {
    const wrapper = document.querySelector('.ad-banner-wrapper');
    
    if (!wrapper) {
        return;
    }
    
    if (direction === 'next' && currentSlide < maxSlide) {
        currentSlide++;
    } else if (direction === 'prev' && currentSlide > 0) {
        currentSlide--;
    }
    
    // 슬라이드 이동
    moveSlide();
    
    // 버튼 활성화/비활성화
    updateSlideButtons();
}

// 슬라이드 이동 함수
function moveSlide() {
    const wrapper = document.querySelector('.ad-banner-wrapper');
    if (!wrapper) return;
    
    if (isMobile()) {
        // 모바일: 배너 너비 + margin-right으로 이동
        const firstBanner = wrapper.querySelector('.ad-banner');
        if (firstBanner) {
            const bannerWidth = firstBanner.offsetWidth;
            const marginRight = 16; // 1rem
            const slideWidth = bannerWidth + marginRight;
            const translateValue = currentSlide * slideWidth;
            
            wrapper.style.transform = `translateX(-${translateValue}px)`;
        }
    } else {
        // PC: 배너 너비와 gap을 정확히 계산
        const firstBanner = wrapper.querySelector('.ad-banner');
        if (firstBanner) {
            const bannerWidth = firstBanner.offsetWidth;
            const computedStyle = window.getComputedStyle(wrapper);
            const gap = parseFloat(computedStyle.gap) || 16;
            
            // 픽셀 단위로 정확히 이동
            const slideWidth = bannerWidth + gap;
            const translateValue = currentSlide * slideWidth;
            
            wrapper.style.transform = `translateX(-${translateValue}px)`;
        }
    }
}

function updateSlideButtons() {
    const prevBtn = document.querySelector('.slide-btn.prev');
    const nextBtn = document.querySelector('.slide-btn.next');
    
    if (prevBtn) {
        prevBtn.style.opacity = currentSlide === 0 ? '0.5' : '1';
        prevBtn.style.cursor = currentSlide === 0 ? 'not-allowed' : 'pointer';
    }
    
    if (nextBtn) {
        nextBtn.style.opacity = currentSlide === maxSlide ? '0.5' : '1';
        nextBtn.style.cursor = currentSlide === maxSlide ? 'not-allowed' : 'pointer';
    }
}

// 전역 함수로 등록 (onclick에서 사용하기 위해)
window.slideAds = slideAds;

// 자동 슬라이드 시작
function startAutoSlide() {
    // 기존 인터벌 제거
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
    }
    
    // 3초마다 자동 슬라이드
    autoSlideInterval = setInterval(() => {
        if (currentSlide < maxSlide) {
            slideAds('next');
        } else {
            // 마지막에 도달하면 처음으로
            currentSlide = -1;
            slideAds('next');
        }
    }, 3000);
}

// 자동 슬라이드 정지
function stopAutoSlide() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }
}

// 배너 순서 랜덤 섞기
function shuffleBanners() {
    const wrapper = document.querySelector('.ad-banner-wrapper');
    if (!wrapper) return;
    
    const banners = Array.from(wrapper.children);
    
    // Fisher-Yates 셔플 알고리즘
    for (let i = banners.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        wrapper.appendChild(banners[j]);
    }
}

// 슬라이더 초기화 함수
function initializeSlider() {
    // 화면 크기에 따른 설정 업데이트
    updateSlideSettings();
    
    // 초기 버튼 상태 설정
    updateSlideButtons();
    
    const wrapper = document.querySelector('.ad-banner-wrapper');
    if (!wrapper) {
        return;
    }
    
    // 배너 순서 랜덤 섞기
    shuffleBanners();
    
    // 초기 위치 설정
    currentSlide = 0;
    moveSlide();
    
    // 자동 슬라이드 시작
    startAutoSlide();
    
    // 터치 스와이프 지원 (모바일)
    const container = document.querySelector('.ad-banner-container');
    if (container) {
        // 마우스 호버 시 자동 슬라이드 정지 (PC만)
        if (!isMobile()) {
            container.addEventListener('mouseenter', stopAutoSlide);
            container.addEventListener('mouseleave', startAutoSlide);
        }
        
        let startX = 0;
        let endX = 0;
        
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            stopAutoSlide(); // 터치 시작 시 자동 슬라이드 정지
        });
        
        container.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            handleSwipe();
            // 터치 종료 2초 후 자동 슬라이드 재시작
            setTimeout(startAutoSlide, 2000);
        });
        
        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = startX - endX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    slideAds('next');
                } else {
                    slideAds('prev');
                }
            }
        }
    }
}

// 사용자 인증 상태 확인 및 관리자 메뉴 표시
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 관리자 여부 확인
        const isAdmin = await checkAdminStatus(user.uid);
        
        if (isAdmin) {
            showAdminMenu();
        }
    }
});

// 관리자 상태 확인
async function checkAdminStatus(uid) {
    try {
        const adminDoc = await getDoc(doc(db, 'admin_users', uid));
        
        if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            // 레벨 10인 경우만 관리자 메뉴 표시
            return adminData.level === 10;
        }
        
        return false;
    } catch (error) {
        console.error('관리자 확인 오류:', error);
        return false;
    }
}

// 관리자 메뉴 표시
function showAdminMenu() {
    // 모든 .admin-menu 찾기
    const adminMenus = document.querySelectorAll('.admin-menu');
    
    adminMenus.forEach(menu => {
        menu.style.cssText = 'display: block !important;';
    });
}

// 로고 이미지 변경 함수
function updateLogo() {
    const logo = document.getElementById('headerLogo') || document.querySelector('.logo');
    if (!logo) return;
    
    if (window.innerWidth <= 768) {
        logo.src = '/img/m_logo.png';
    } else {
        logo.src = '/img/logo.png';
    }
}

// 햄버거 메뉴 기능 초기화
function initializeHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const navMenu = document.getElementById('navMenu');
    
    if (!hamburgerMenu || !navMenu) return;
    
    // 햄버거 메뉴 클릭 이벤트
    hamburgerMenu.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // 메뉴 항목 클릭 시 메뉴 닫기
    const menuLinks = navMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburgerMenu.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // 초기 로고 설정
    updateLogo();
    
    // 화면 크기 변경 시 메뉴 초기화 및 로고 변경
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            hamburgerMenu.classList.remove('active');
            navMenu.classList.remove('active');
        }
        updateLogo();
        
        // 슬라이더 설정 업데이트
        updateSlideSettings();
        // 현재 슬라이드 위치 재조정
        currentSlide = Math.min(currentSlide, maxSlide);
        moveSlide();
        updateSlideButtons();
    });
    
    // 메뉴 외부 클릭 시 닫기
    document.addEventListener('click', function(event) {
        if (!navMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            hamburgerMenu.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeHamburgerMenu();
        initializeSlider();
    });
} else {
    initializeHamburgerMenu();
    initializeSlider();
}