// 파일 경로: public/js/header.js
// 파일 이름: header.js

// Firebase imports
import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 광고 슬라이드 관련 변수
let currentSlide = 0;
let maxSlide = 9; // 10개 배너 (0-9)
let autoSlideInterval;
let containerWidth = 0;
let gap = 10;

// 광고 배너 랜덤 배치
function randomizeBanners() {
    const wrapper = document.querySelector('.ad-banner-wrapper');
    if (!wrapper) return;
    
    const banners = Array.from(wrapper.children);
    
    // Fisher-Yates 셔플 알고리즘
    for (let i = banners.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [banners[i], banners[j]] = [banners[j], banners[i]];
    }
    
    // DOM에 재배치
    banners.forEach(banner => wrapper.appendChild(banner));
}

// 슬라이드 이동
function moveSlide() {
    const wrapper = document.querySelector('.ad-banner-wrapper');
    const container = document.querySelector('.ad-banner-container');
    if (!wrapper || !container) return;
    
    // 실제 컨테이너 너비 가져오기
    const actualWidth = container.clientWidth;
    
    // 현재 슬라이드 위치 계산
    const moveDistance = currentSlide * actualWidth;
    wrapper.style.transform = `translateX(-${moveDistance}px)`;
}

// 컨테이너 너비 설정
function setupContainerWidth() {
    const container = document.querySelector('.ad-banner-container');
    const wrapper = document.querySelector('.ad-banner-wrapper');
    const banners = document.querySelectorAll('.ad-banner');
    
    if (!container || !wrapper || !banners.length) return;
    
    // 컨테이너의 실제 너비 가져오기
    containerWidth = container.clientWidth;
    
    // 각 배너의 너비를 컨테이너 너비로 설정
    banners.forEach((banner) => {
        banner.style.width = containerWidth + 'px';
        banner.style.marginRight = '0';
    });
    
    // wrapper의 전체 너비 설정
    const totalWidth = containerWidth * banners.length;
    wrapper.style.width = totalWidth + 'px';
}

// 자동 슬라이드
function startAutoSlide() {
    stopAutoSlide(); // 기존 인터벌 정리
    
    autoSlideInterval = setInterval(() => {
        if (currentSlide >= maxSlide) {
            currentSlide = 0;
        } else {
            currentSlide++;
        }
        moveSlide();
    }, 4000); // 4초마다 슬라이드
}

// 자동 슬라이드 중지
function stopAutoSlide() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }
}

// 슬라이더 초기화
function initializeSlider() {
    // 배너 랜덤 배치
    randomizeBanners();
    
    // 컨테이너 너비 설정
    setupContainerWidth();
    
    // 초기 위치
    moveSlide();
    
    // 자동 슬라이드 시작
    startAutoSlide();
    
    // 터치 이벤트 처리
    let touchStartX = 0;
    let touchEndX = 0;
    
    const container = document.querySelector('.ad-banner-container');
    if (!container) return;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        stopAutoSlide();
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        
        setTimeout(() => {
            startAutoSlide();
        }, 5000);
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentSlide < maxSlide) {
                currentSlide++;
            } else if (diff < 0 && currentSlide > 0) {
                currentSlide--;
            }
            moveSlide();
        }
    }
    
    // 마우스 호버 시 자동 슬라이드 중지
    container.addEventListener('mouseenter', stopAutoSlide);
    container.addEventListener('mouseleave', startAutoSlide);
    
    // 윈도우 리사이즈 시 재계산
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            setupContainerWidth();
            moveSlide();
        }, 100); // 더 빠른 반응을 위해 250ms에서 100ms로 변경
    });
}

// 뒤로가기 기능
window.goBack = function() {
    window.history.back();
}

// 로고 표시 페이지 확인
function checkLogoDisplay() {
    const currentPath = window.location.pathname;
    const logoPages = [
        '/main/main.html',
        '/',
        '/index.html'
    ];
    
    const logoLink = document.getElementById('logoLink');
    const backButton = document.getElementById('backButton');
    
    if (!logoLink || !backButton) return;
    
    // 로고를 표시할 페이지인지 확인
    const showLogo = logoPages.includes(currentPath);
    
    if (showLogo) {
        // 로고 표시, 뒤로가기 숨김
        logoLink.style.cssText = 'display: block !important;';
        backButton.style.cssText = 'display: none !important;';
    } else {
        // 로고 숨김, 뒤로가기 표시 (기본 상태 유지)
        logoLink.style.cssText = 'display: none !important;';
        backButton.style.cssText = 'display: flex !important;';
    }
}

// 보호된 페이지 확인
function isProtectedPage() {
    const protectedPaths = [
        '/admin/',
        '/advertise/',
        '/community/html/write.html',
        '/community/html/edit.html'
    ];
    
    const currentPath = window.location.pathname;
    return protectedPaths.some(path => currentPath.includes(path));
}

// 활성 메뉴 설정
function setActiveMenu() {
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('nav a');
    
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href && currentPath.includes(href) && href !== '#' && href !== '/') {
            link.classList.add('active');
        } else if (href === '/' && (currentPath === '/' || currentPath === '/index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// 사용자 상태 표시 텍스트 매핑
const userTypeDisplayText = {
    'individual': '여성회원',
    'partner': '제휴업체',
    'business': '업소회원'
};

// 사용자 정보 업데이트 함수
async function updateUserInfo(uid) {
    try {
        // users 컬렉션에서 사용자 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // 사용자 상태 업데이트
            const userStatusElement = document.querySelector('.user-status');
            const userNameElement = document.querySelector('.user-name');
            
            if (userStatusElement && userData.userType) {
                userStatusElement.textContent = userTypeDisplayText[userData.userType] || '일반회원';
                // data-type 속성 추가하여 CSS에서 색상 적용
                userStatusElement.setAttribute('data-type', userData.userType);
            }
            
            if (userNameElement && userData.nickname) {
                userNameElement.textContent = userData.nickname;
            }
        }
    } catch (error) {
        console.error('사용자 정보 가져오기 오류:', error);
    }
}

// 사용자 인증 상태 확인 및 메뉴 표시
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 로그인한 경우 로그아웃 메뉴 표시
        showLogoutMenu();
        
        // 사용자 정보 업데이트
        await updateUserInfo(user.uid);
        
        // 관리자 여부 확인
        const isAdmin = await checkAdminStatus(user.uid);
        if (isAdmin) {
            showAdminMenu();
        }
        
        // 기업회원 여부 확인 (users 컬렉션의 userType 확인)
        const isBusinessUser = await checkBusinessUserStatus(user.uid);
        if (isBusinessUser) {
            showAdvertiseMenu();
        }
        
        // 파트너회원 여부 확인 (users 컬렉션의 userType 확인)
        const isPartnerUser = await checkPartnerUserStatus(user.uid);
        if (isPartnerUser) {
            showAdvertiseMenu();
        }
    } else {
        // 로그인하지 않은 경우
        hideLogoutMenu();
        
        // 기본값으로 설정
        const userStatusElement = document.querySelector('.user-status');
        const userNameElement = document.querySelector('.user-name');
        
        if (userStatusElement) {
            userStatusElement.textContent = '일반회원';
            userStatusElement.setAttribute('data-type', 'individual'); // 기본값은 여성회원 색상
        }
        
        if (userNameElement) {
            userNameElement.textContent = '뺏츠한 뚝배기';
        }
        
        // 보호된 페이지에 있고 로그인 페이지가 아닌 경우 리다이렉트
        if (isProtectedPage() && !window.location.pathname.includes('/auth/login.html')) {
            window.location.href = '/auth/login.html';
            sessionStorage.setItem('loginRequired', 'true');
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

// 기업회원 상태 확인
async function checkBusinessUserStatus(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.userType === 'business';
        }
        return false;
    } catch (error) {
        console.error('기업회원 확인 오류:', error);
        return false;
    }
}

// 파트너회원 상태 확인
async function checkPartnerUserStatus(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.userType === 'partner';
        }
        return false;
    } catch (error) {
        console.error('파트너회원 확인 오류:', error);
        return false;
    }
}

// 관리자 메뉴 표시
function showAdminMenu() {
    const adminMenus = document.querySelectorAll('.admin-menu');
    
    adminMenus.forEach(menu => {
        menu.style.cssText = 'display: block !important;';
    });
}

// 광고관리 메뉴 표시
function showAdvertiseMenu() {
    const advertiseMenus = document.querySelectorAll('.advertise-menu');
    
    advertiseMenus.forEach(menu => {
        menu.style.cssText = 'display: block !important;';
    });
}

// 로그아웃 메뉴 표시
function showLogoutMenu() {
    const logoutMenus = document.querySelectorAll('.logout-menu');
    logoutMenus.forEach(menu => {
        menu.style.cssText = 'display: block !important;';
    });
}

// 로그아웃 메뉴 숨김
function hideLogoutMenu() {
    const logoutMenus = document.querySelectorAll('.logout-menu');
    logoutMenus.forEach(menu => {
        menu.style.cssText = 'display: none !important;';
    });
}

// 로그아웃 처리
window.handleLogout = async function() {
    if (confirm('로그아웃 하시겠습니까?')) {
        try {
            await auth.signOut();
            window.location.href = '/auth/login.html';
        } catch (error) {
            console.error('로그아웃 오류:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    }
}

// 로고 이미지 변경 함수
function updateLogo() {
    const logo = document.getElementById('headerLogo') || document.querySelector('.logo');
    if (!logo) return;
    
    // 450px 고정이므로 항상 모바일 로고 사용
    logo.src = '/img/m_logo.png';
}

// 햄버거 메뉴 기능 초기화
function initializeHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const navMenu = document.getElementById('navMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (!hamburgerMenu || !navMenu || !menuOverlay) return;
    
    // 햄버거 메뉴 클릭 이벤트
    hamburgerMenu.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    });
    
    // 메뉴 항목 클릭 시 메뉴 닫기
    const menuLinks = navMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburgerMenu.classList.remove('active');
            navMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
        });
    });
    
    // 초기 로고 설정
    updateLogo();
    
    // 오버레이 클릭 시 메뉴 닫기
    menuOverlay.addEventListener('click', function() {
        hamburgerMenu.classList.remove('active');
        navMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
    });
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeHamburgerMenu();
        initializeSlider();
        setActiveMenu();
        checkLogoDisplay();
    });
} else {
    initializeHamburgerMenu();
    initializeSlider();
    setActiveMenu();
    checkLogoDisplay();
}

// 페이지 전환 시 자동 슬라이드 정리
window.addEventListener('beforeunload', () => {
    stopAutoSlide();
});