// 광고 배너 슬라이드 기능
let currentSlide = 0;
const totalSlides = 6; // 전체 배너 수
const visibleSlides = 4; // 한 번에 보이는 배너 수
const maxSlide = totalSlides - visibleSlides;

function slideAds(direction) {
    const wrapper = document.querySelector('.ad-banner-wrapper');
    
    if (direction === 'next' && currentSlide < maxSlide) {
        currentSlide++;
    } else if (direction === 'prev' && currentSlide > 0) {
        currentSlide--;
    }
    
    const translateValue = currentSlide * 25; // 각 슬라이드는 25%씩 이동
    wrapper.style.transform = `translateX(-${translateValue}%)`;
    
    // 버튼 활성화/비활성화
    updateSlideButtons();
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

// 초기화 함수를 전역으로 노출
window.initializeSlider = function() {
    // 초기 버튼 상태 설정
    updateSlideButtons();
    
    // 터치 스와이프 지원 (모바일)
    const container = document.querySelector('.ad-banner-container');
    if (container) {
        let startX = 0;
        let endX = 0;
        
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        container.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            handleSwipe();
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

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeSlider);
} else {
    window.initializeSlider();
}