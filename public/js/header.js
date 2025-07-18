// Firebase 모듈 임포트
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// 슬라이더 설정
let currentSlide = 0;
let maxSlide = 0;
let slidesToShow = 3;

// 화면 크기에 따른 슬라이드 설정
function updateSlideSettings() {
    const width = window.innerWidth;
    
    if (width <= 768) {
        slidesToShow = 1;
    } else if (width <= 1024) {
        slidesToShow = 2;
    } else {
        slidesToShow = 3;
    }
    
    const totalSlides = document.querySelectorAll('.ad-banner').length;
    maxSlide = Math.max(0, totalSlides - slidesToShow);
}

// 슬라이드 이동
function moveSlide() {
    const wrapper = document.querySelector('.ad-banner-wrapper');
    if (!wrapper) return;
    
    const slideWidth = 100 / slidesToShow;
    const translateX = -currentSlide * slideWidth;
    wrapper.style.transform = `translateX(${translateX}%)`;
}

// 슬라이드 버튼 업데이트
function updateSlideButtons() {
    const prevBtn = document.querySelector('.slide-btn.prev');
    const nextBtn = document.querySelector('.slide-btn.next');
    
    if (!prevBtn || !nextBtn) return;
    
    prevBtn.style.opacity = currentSlide === 0 ? '0.5' : '1';
    prevBtn.style.pointerEvents = currentSlide === 0 ? 'none' : 'auto';
    
    nextBtn.style.opacity = currentSlide >= maxSlide ? '0.5' : '1';
    nextBtn.style.pointerEvents = currentSlide >= maxSlide ? 'none' : 'auto';
}

// 광고 슬라이드 함수
window.slideAds = function(direction) {
    if (direction === 'prev' && currentSlide > 0) {
        currentSlide--;
    } else if (direction === 'next' && currentSlide < maxSlide) {
        currentSlide++;
    }
    
    moveSlide();
    updateSlideButtons();
};

// 슬라이더 초기화
function initializeSlider() {
    updateSlideSettings();
    moveSlide();
    updateSlideButtons();
    
    // 터치 이벤트 처리 (모바일)
    let touchStartX = 0;
    let touchEndX = 0;
    
    const container = document.querySelector('.ad-banner-container');
    if (!container) return;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentSlide < maxSlide) {
                slideAds('next');
            } else if (diff < 0 && currentSlide > 0) {
                slideAds('prev');
            }
        }
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

// 로컬 스토리지에서 사용자 타입 가져오기
function getUserTypeFromLocalStorage() {
    const userType = localStorage.getItem('userType');
    const lastLoginTime = localStorage.getItem('lastLoginTime');
    
    // 24시간 이내의 로그인 정보만 사용
    if (userType && lastLoginTime) {
        const timeDiff = Date.now() - parseInt(lastLoginTime);
        if (timeDiff < 24 * 60 * 60 * 1000) { // 24시간
            return userType;
        }
    }
    return null;
}

// 로컬 스토리지에 사용자 타입 저장
function saveUserTypeToLocalStorage(userType) {
    localStorage.setItem('userType', userType);
    localStorage.setItem('lastLoginTime', Date.now().toString());
}

// 사용자 타입에 따른 메뉴 즉시 표시
function showMenusByUserType(userType) {
    if (userType === 'admin') {
        showAdminMenu();
    } else if (userType === 'business' || userType === 'partner') {
        showAdvertiseMenu();
    }
}

// 사용자 인증 상태 확인 및 메뉴 표시
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 로그인한 경우 로그아웃 메뉴 표시
        showLogoutMenu();
        
        // 로컬 스토리지에서 사용자 타입 확인하여 즉시 메뉴 표시
        const cachedUserType = getUserTypeFromLocalStorage();
        if (cachedUserType) {
            showMenusByUserType(cachedUserType);
        }
        
        // 백그라운드에서 실제 사용자 타입 확인 (병렬 처리)
        const checkPromises = [
            checkAdminStatus(user.uid),
            checkBusinessUserStatus(user.uid),
            checkPartnerUserStatus(user.uid)
        ];
        
        const [isAdmin, isBusinessUser, isPartnerUser] = await Promise.all(checkPromises);
        
        // 실제 사용자 타입 확인 후 메뉴 업데이트 및 캐시 저장
        if (isAdmin) {
            showAdminMenu();
            saveUserTypeToLocalStorage('admin');
        } else if (isBusinessUser) {
            showAdvertiseMenu();
            saveUserTypeToLocalStorage('business');
        } else if (isPartnerUser) {
            showAdvertiseMenu();
            saveUserTypeToLocalStorage('partner');
        } else {
            saveUserTypeToLocalStorage('individual');
        }
    } else {
        // 로그인하지 않은 경우
        hideLogoutMenu();
        localStorage.removeItem('userType');
        localStorage.removeItem('lastLoginTime');
        
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
        const businessDoc = await getDoc(doc(db, 'business_users', uid));
        return businessDoc.exists();
    } catch (error) {
        console.error('기업회원 확인 오류:', error);
        return false;
    }
}

// 파트너회원 상태 확인
async function checkPartnerUserStatus(uid) {
    try {
        const partnerDoc = await getDoc(doc(db, 'partner_users', uid));
        return partnerDoc.exists();
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
            // 로컬 스토리지 정리
            localStorage.removeItem('userType');
            localStorage.removeItem('lastLoginTime');
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
        setActiveMenu();
    });
} else {
    initializeHamburgerMenu();
    initializeSlider();
    setActiveMenu();
}