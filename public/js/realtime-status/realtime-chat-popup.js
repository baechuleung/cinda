// 채팅 팝업 기능
export function initializeChatPopup() {
    const chatButtons = document.querySelectorAll('.action-btn.chat');
    chatButtons.forEach(btn => {
        btn.addEventListener('click', openChatPopup);
    });
}

function openChatPopup(e) {
    e.preventDefault();
    
    const card = this.closest('.status-card');
    const location = card.querySelector('.location').textContent;
    
    // 모바일/PC 분기
    if (window.innerWidth <= 768) {
        openMobileChat(card, location, this);
    } else {
        openDesktopChat(card, location, this);
    }
}

// 모바일 채팅
function openMobileChat(card, location, button) {
    // 이미 활성화된 버튼인지 먼저 확인
    const isActive = button.classList.contains('active');
    
    // 기존 열린 채팅 닫기
    closeAllMobilePopups();
    
    // 이미 활성화된 버튼 클릭시 닫기만 하고 종료
    if (isActive) {
        return;
    }
    
    // 활성화
    card.classList.add('active');
    button.classList.add('active');
    
    // 채팅 영역 생성
    const chatArea = createMobileChatArea(location);
    
    // 선택된 카드 바로 다음에 삽입
    card.parentNode.insertBefore(chatArea, card.nextSibling);
    
    // 이벤트 연결
    setupChatEvents(chatArea);
}

// PC 채팅
function openDesktopChat(card, location, button) {
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
    
    // 채팅 내용 넣기 - 모바일과 동일한 HTML 사용
    rightSection.innerHTML = createChatHTML(location);
    rightSection.style.display = 'flex';
    
    // 이벤트 연결
    setupChatEvents(rightSection);
}

// 모바일 채팅 영역 생성
function createMobileChatArea(location) {
    const area = document.createElement('div');
    area.className = 'mobile-action-area';
    area.innerHTML = createChatHTML(location);
    return area;
}

// 채팅 HTML 생성
function createChatHTML(location) {
    // 고양이 스타일만 사용
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${Math.random()}`;
    
    return `
        <div class="mobile-action-container">
            <div class="chat-header">
                <h3>실시간 채팅톡</h3>
                <button class="close-btn" onclick="closeAllMobilePopups()">×</button>
            </div>
            
            <div class="chat-info">
                <span class="store-info">${location} 23명</span>
            </div>
            
            <div class="chat-content-area">
                <div class="chat-messages">
                    <div class="chat-notice-box">
                        <span class="notice-label">공지</span>
                        <span class="notice-text">이곳은 익명 채팅방입니다. 욕설 및 비방은 자제해주세요.</span>
                    </div>
                    
                    <div class="chat-message">
                        <div class="message-header">
                            <img src="${avatarUrl}" alt="프로필" class="profile-icon">
                            <span class="author">듀우진 팀슬기</span>
                        </div>
                        <div class="message-wrapper">
                            <div class="message-box">
                                <div class="message-content">지금 갈때 강남 할지 분당햄싶대서 37명🤗</div>
                            </div>
                            <span class="time">오후 11:39</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="chat-input-area">
                <input type="text" placeholder="메세지를 입력하세요..." class="chat-input">
                <button class="send-btn">전송</button>
            </div>
        </div>
    `;
}

// 채팅 이벤트 설정
function setupChatEvents(container) {
    const input = container.querySelector('.chat-input');
    const sendBtn = container.querySelector('.send-btn');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', () => sendMessage(container));
    }
    
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage(container);
        });
    }
}

// 메시지 전송
function sendMessage(container) {
    const input = container.querySelector('.chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const messagesArea = container.querySelector('.chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message my-message';
    
    messageDiv.innerHTML = `
        <div class="message-wrapper">
            <span class="time">오후 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            <div class="message-box">
                <div class="message-content">${message}</div>
            </div>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    input.value = '';
}

// 모든 모바일 팝업 닫기
function closeAllMobilePopups() {
    document.querySelectorAll('.mobile-action-area').forEach(area => area.remove());
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
}

// 전역 함수로 등록
window.closeAllMobilePopups = closeAllMobilePopups;

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