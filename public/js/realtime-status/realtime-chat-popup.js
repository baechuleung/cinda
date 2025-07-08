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
    card.appendChild(chatArea);
    
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
    
    // 채팅 내용 넣기
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
    return `
        <div class="chat-header">
            <h3>실시간 채팅룸</h3>
            <span class="location-tag">${location} 180번</span>
        </div>
        
        <div class="chat-notice">
            <div class="notice-icon">🏠</div>
            <div class="notice-content">
                <strong>공지사항</strong>
                <p>아래는 익명 나나나 단지를 위한/클래/호를, 서비스 접서제 안하는 내용, 분발</p>
                <p>등 조직기 안돈 경우, 은행충책에 피고버와 마신기 달에 계좌 잘 수 있으시기 주</p>
                <p>은행드립니다.</p>
            </div>
            <button class="close-btn" onclick="this.parentElement.style.display='none'">감추기 ⌃</button>
        </div>
        
        <div class="chat-messages">
            <div class="chat-message">
                <div class="message-info">
                    <span class="author">듀우진 팀슬기</span>
                    <span class="time">오후 11:39</span>
                </div>
                <div class="message-content">지금 갈때 강남 할지 분당햄싶대서 37명🤗</div>
            </div>
        </div>
        
        <div class="chat-input-area">
            <input type="text" placeholder="메세지를 입력하세요..." class="chat-input">
            <button class="send-btn">전송</button>
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
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
        <div class="message-info">
            <span class="author">나</span>
            <span class="time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="message-content">${message}</div>
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