// header.js - 헤더 관련 스크립트
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// DOM 요소 캐싱
let currentSlide = 0;
let adBannerWrapper = null;
let slideTimer = null;

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', function() {
    adBannerWrapper = document.getElementById('adBannerWrapper');
    
    // 사용자 상태 확인 및 메뉴 표시
    checkAuthState();
    
    // 현재 페이지 활성화
    setActiveNavItem();
    
    // 광고 배너 로드
    loadAdvertisements();
    
    // 모바일 자동 슬라이드 시작
    if (window.innerWidth <= 768) {
        startAutoSlide();
    }
});

// 인증 상태 확인
function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
        const adminMenu = document.querySelector('.admin-menu');
        const advertiseMenu = document.querySelector('.advertise-menu');
        const logoutMenu = document.querySelector('.logout-menu');
        
        if (user) {
            // 로그인 상태
            if (advertiseMenu) advertiseMenu.style.display = 'block';
            if (logoutMenu) logoutMenu.style.display = 'block';
            
            // 관리자 여부 확인
            const isAdmin = await checkIsAdmin(user.uid);
            if (adminMenu) {
                adminMenu.style.display = isAdmin ? 'block' : 'none';
            }
        } else {
            // 로그아웃 상태
            if (adminMenu) adminMenu.style.display = 'none';
            if (advertiseMenu) advertiseMenu.style.display = 'none';
            if (logoutMenu) logoutMenu.style.display = 'none';
        }
    });
}

// 관리자 여부 확인
async function checkIsAdmin(uid) {
    try {
        const userQuery = query(collection(db, 'users'), where('uid', '==', uid));
        const querySnapshot = await getDocs(userQuery);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            return userData.role === 'admin';
        }
        return false;
    } catch (error) {
        console.error('관리자 확인 오류:', error);
        return false;
    }
}

// 현재 페이지 네비게이션 활성화
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        if (href === currentPath || (currentPath.includes(href) && href !== '/')) {
            link.classList.add('active');
        }
    });
}

// 광고 로드
async function loadAdvertisements() {
    try {
        const now = new Date();
        const adsQuery = query(
            collection(db, 'advertisements'),
            where('type', '==', 'top'),
            where('status', '==', 'active'),
            where('endDate', '>=', now),
            orderBy('endDate', 'asc'),
            limit(6)
        );
        
        const querySnapshot = await getDocs(adsQuery);
        const ads = [];
        
        querySnapshot.forEach((doc) => {
            ads.push({ id: doc.id, ...doc.data() });
        });
        
        // 광고 배너에 데이터 적용
        displayAdvertisements(ads);
        
    } catch (error) {
        console.error('광고 로드 오류:', error);
    }
}

// 광고 표시
function displayAdvertisements(ads) {
    const banners = document.querySelectorAll('.ad-banner');
    
    banners.forEach((banner, index) => {
        const adContent = banner.querySelector('.ad-content');
        
        if (ads[index]) {
            const ad = ads[index];
            banner.setAttribute('data-ad-id', ad.id);
            
            // 광고 내용 표시
            adContent.innerHTML = `
                <a href="${ad.link || '#'}" target="_blank" style="
                    display: block;
                    width: 100%;
                    height: 100%;
                    text-decoration: none;
                    color: inherit;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    text-align: center;
                ">
                    <span style="font-size: 14px; font-weight: 500;">${ad.title || ad.businessName}</span>
                </a>
            `;
            
            // 광고 스타일 적용
            banner.style.background = ad.backgroundColor || '#f5f5f5';
            banner.style.color = ad.textColor || '#333';
            
        } else {
            // 빈 슬롯 표시
            adContent.innerHTML = `
                <a href="/advertise/html/ad-add.html" style="
                    display: block;
                    width: 100%;
                    height: 100%;
                    text-decoration: none;
                    color: #999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    광고 신청
                </a>
            `;
        }
    });
}

// 광고 슬라이드 (PC)
function slideAds(direction) {
    if (!adBannerWrapper) return;
    
    const totalBanners = document.querySelectorAll('.ad-banner').length;
    const isMobile = window.innerWidth <= 768;
    const bannersToShow = isMobile ? 1 : 4;
    const maxSlide = Math.max(0, totalBanners - bannersToShow);
    
    if (direction === 'next') {
        currentSlide = Math.min(currentSlide + 1, maxSlide);
    } else {
        currentSlide = Math.max(currentSlide - 1, 0);
    }
    
    const translateX = currentSlide * (100 / bannersToShow + (isMobile ? 0 : 1));
    adBannerWrapper.style.transform = `translateX(-${translateX}%)`;
}

// 모바일 자동 슬라이드
function startAutoSlide() {
    if (slideTimer) clearInterval(slideTimer);
    
    slideTimer = setInterval(() => {
        const totalBanners = document.querySelectorAll('.ad-banner').length;
        currentSlide = (currentSlide + 1) % totalBanners;
        
        const translateX = currentSlide * 85; // 80% 너비 + 5% 간격
        adBannerWrapper.style.transform = `translateX(-${translateX}%)`;
    }, 3000);
}

// 햄버거 메뉴 토글
function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.querySelector('.hamburger-menu');
    
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
    
    // 메뉴 열림 시 스크롤 방지
    if (navMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// 로그아웃 처리
async function handleLogout() {
    try {
        await auth.signOut();
        alert('로그아웃되었습니다.');
        window.location.href = '/';
    } catch (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
}

// 화면 크기 변경 시 처리
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    
    // 로고 변경
    const logo = document.getElementById('headerLogo');
    if (logo) {
        logo.src = isMobile ? '/img/m_logo.png' : '/img/logo.png';
    }
    
    // 모바일 자동 슬라이드 처리
    if (isMobile) {
        startAutoSlide();
    } else {
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
    }
    
    // 메뉴 닫기
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.querySelector('.hamburger-menu');
    if (!isMobile && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// 전역 함수로 노출
window.slideAds = slideAds;
window.toggleMenu = toggleMenu;
window.handleLogout = handleLogout;