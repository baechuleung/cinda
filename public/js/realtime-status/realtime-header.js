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
    console.log('슬라이드 설정 업데이트 - visibleSlides:', visibleSlides, 'maxSlide:', maxSlide);
}

function slideAds(direction) {
    console.log('slideAds 호출됨:', direction);
    const wrapper = document.querySelector('.ad-banner-wrapper');
    
    if (!wrapper) {
        console.error('ad-banner-wrapper를 찾을 수 없습니다!');
        return;
    }
    
    console.log('현재 슬라이드:', currentSlide);
    
    if (direction === 'next' && currentSlide < maxSlide) {
        currentSlide++;
    } else if (direction === 'prev' && currentSlide > 0) {
        currentSlide--;
    }
    
    console.log('이동 후 슬라이드:', currentSlide);
    
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
            console.log('모바일 이동 - 배너너비:', bannerWidth, 'margin:', marginRight, '슬라이드너비:', slideWidth, '총이동:', translateValue);
        }
    } else {
        // PC: 배너 너비와 gap을 정확히 계산
        const firstBanner = wrapper.querySelector('.ad-banner');
        if (firstBanner) {
            const containerWidth = wrapper.parentElement.offsetWidth;
            const bannerWidth = firstBanner.offsetWidth;
            const computedStyle = window.getComputedStyle(wrapper);
            const gap = parseFloat(computedStyle.gap) || 16;
            
            // 픽셀 단위로 정확히 이동
            const slideWidth = bannerWidth + gap;
            const translateValue = currentSlide * slideWidth;
            
            wrapper.style.transform = `translateX(-${translateValue}px)`;
            console.log('PC 이동 - 배너너비:', bannerWidth, 'gap:', gap, '슬라이드너비:', slideWidth, '총이동:', translateValue);
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
window.startAutoSlide = startAutoSlide;
window.stopAutoSlide = stopAutoSlide;

// 자동 슬라이드 시작
function startAutoSlide() {
    console.log('자동 슬라이드 시작');
    
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
    
    console.log('배너 순서 랜덤 섞기 완료');
}

// 모바일에서 placeholder 텍스트 변경
function updateMobilePlaceholders() {
    const searchInput = document.getElementById('searchInput');
    const businessSelect = document.getElementById('businessTypeSelect');
    
    if (isMobile()) {
        if (searchInput) {
            searchInput.placeholder = '매장검색';
        }
        if (businessSelect && businessSelect.options[0]) {
            businessSelect.options[0].text = '업종선택';
        }
    } else {
        if (searchInput) {
            searchInput.placeholder = '매장명을 검색해주세요';
        }
        if (businessSelect && businessSelect.options[0]) {
            businessSelect.options[0].text = '업종을 선택해주세요.';
        }
    }
}

// 초기화 함수
window.initializeSlider = function() {
    console.log('initializeSlider 호출됨');
    
    // 화면 크기에 따른 설정 업데이트
    updateSlideSettings();
    
    // 모바일에서 placeholder 텍스트 변경
    updateMobilePlaceholders();
    
    // 초기 버튼 상태 설정
    updateSlideButtons();
    
    // 슬라이더 요소 확인
    const wrapper = document.querySelector('.ad-banner-wrapper');
    const prevBtn = document.querySelector('.slide-btn.prev');
    const nextBtn = document.querySelector('.slide-btn.next');
    
    console.log('슬라이더 요소 확인:');
    console.log('- wrapper:', wrapper);
    console.log('- prevBtn:', prevBtn);
    console.log('- nextBtn:', nextBtn);
    
    if (!wrapper) {
        console.error('초기화 실패: ad-banner-wrapper를 찾을 수 없습니다');
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

// 화면 크기 변경 감지
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        updateSlideSettings();
        updateMobilePlaceholders(); // 리사이즈 시에도 placeholder 업데이트
        // 현재 슬라이드 위치 재조정
        currentSlide = Math.min(currentSlide, maxSlide);
        moveSlide();
        updateSlideButtons();
    }, 250);
});

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeSlider);
} else {
    window.initializeSlider();
}