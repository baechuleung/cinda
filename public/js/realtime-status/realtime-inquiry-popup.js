// 문의 팝업 기능
export function initializeInquiryPopup() {
    const inquiryButtons = document.querySelectorAll('.action-btn.inquiry');
    inquiryButtons.forEach(btn => {
        btn.addEventListener('click', openInquiryPopup);
    });
}

function openInquiryPopup(e) {
    e.preventDefault();
    
    const card = this.closest('.status-card');
    const location = card.querySelector('.location').textContent;
    
    // 모바일/PC 분기
    if (window.innerWidth <= 768) {
        openMobileInquiry(card, location, this);
    } else {
        openDesktopInquiry(card, location, this);
    }
}

// 모바일 문의
function openMobileInquiry(card, location, button) {
    // 이미 활성화된 버튼 클릭시 닫기
    if (button.classList.contains('active')) {
        closeAllMobilePopups();
        return;
    }
    
    // 기존 열린 팝업 닫기
    closeAllMobilePopups();
    
    // 활성화
    card.classList.add('active');
    button.classList.add('active');
    
    // 문의 영역 생성
    const inquiryArea = createMobileInquiryArea(location);
    
    // 카드의 위치를 기준으로 절대 위치 설정
    const cardIndex = Array.from(card.parentNode.children).indexOf(card);
    const nextCard = card.parentNode.children[cardIndex + 1];
    
    // 그리드 컨테이너의 바로 다음에 삽입 (그리드 밖에)
    const grid = card.parentNode;
    
    if (nextCard) {
        // 다음 카드가 있으면 그 전에 삽입
        grid.parentNode.insertBefore(inquiryArea, grid.nextSibling);
    } else {
        // 마지막 카드면 그리드 다음에 삽입
        grid.parentNode.insertBefore(inquiryArea, grid.nextSibling);
    }
    
    // 이벤트 연결
    setupInquiryEvents(inquiryArea);
}

// PC 문의
function openDesktopInquiry(card, location, button) {
    const rightSection = document.querySelector('.right-section');
    const mainContainer = document.querySelector('.main-container');
    
    // 이미 활성화된 버튼 클릭시 닫기
    if (button.classList.contains('active')) {
        closeDesktopPopup();
        return;
    }
    
    // 기존 활성화 제거
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    // 활성화
    card.classList.add('active');
    button.classList.add('active');
    mainContainer.classList.add('right-active');
    
    // 문의 내용 넣기 - 모바일과 동일한 HTML 사용
    rightSection.innerHTML = createInquiryHTML(location);
    rightSection.style.display = 'flex';
    
    // 이벤트 연결
    setupInquiryEvents(rightSection);
}

// 모바일 문의 영역 생성
function createMobileInquiryArea(location) {
    const area = document.createElement('div');
    area.className = 'mobile-action-area';
    area.innerHTML = createInquiryHTML(location);
    return area;
}

// 문의 HTML 생성
function createInquiryHTML(location) {
    return `
        <div class="mobile-action-container">
            <div class="inquiry-header">
                <h3>문의하기</h3>
                <span class="location-tag">${location}</span>
            </div>
            
            <div class="inquiry-form-container">
                <form class="right-inquiry-form">
                    <div class="form-group">
                        <label>문의 유형</label>
                        <select name="type" required>
                            <option value="">선택해주세요</option>
                            <option value="reservation">예약 문의</option>
                            <option value="service">서비스 문의</option>
                            <option value="price">가격 문의</option>
                            <option value="other">기타 문의</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>이름</label>
                        <input type="text" name="name" placeholder="이름을 입력해주세요" required>
                    </div>
                    <div class="form-group">
                        <label>연락처</label>
                        <input type="tel" name="phone" placeholder="010-0000-0000" required>
                    </div>
                    <div class="form-group">
                        <label>문의 내용</label>
                        <textarea name="content" rows="4" placeholder="문의하실 내용을 입력해주세요" required></textarea>
                    </div>
                    <button type="submit" class="submit-inquiry-btn">문의하기</button>
                </form>
            </div>
        </div>
    `;
}

// 문의 이벤트 설정
function setupInquiryEvents(container) {
    const form = container.querySelector('.right-inquiry-form');
    if (form) {
        form.addEventListener('submit', handleInquirySubmit);
    }
}

// 문의 제출 처리
function handleInquirySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const location = e.target.closest('.mobile-action-area, .right-section')
                           .querySelector('.location-tag').textContent;
    
    const inquiryData = {
        location: location,
        type: formData.get('type'),
        name: formData.get('name'),
        phone: formData.get('phone'),
        content: formData.get('content'),
        timestamp: new Date()
    };
    
    console.log('문의 제출:', inquiryData);
    
    // TODO: 서버로 전송
    alert('문의가 접수되었습니다.');
    
    // 폼 초기화
    e.target.reset();
}

// 모든 모바일 팝업 닫기
function closeAllMobilePopups() {
    document.querySelectorAll('.mobile-action-area').forEach(area => area.remove());
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
}

// PC 팝업 닫기
function closeDesktopPopup() {
    const rightSection = document.querySelector('.right-section');
    const mainContainer = document.querySelector('.main-container');
    
    rightSection.style.display = 'none';
    mainContainer.classList.remove('right-active');
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
}