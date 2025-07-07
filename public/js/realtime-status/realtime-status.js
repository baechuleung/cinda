// 탭 메뉴 기능
document.addEventListener('DOMContentLoaded', function() {
    // 탭 전환
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 탭에 따른 데이터 필터링 로직 추가 가능
            const tabType = this.dataset.tab;
            filterCards(tabType);
        });
    });
    
    // 카드 필터링
    function filterCards(type) {
        // 실제 구현 시 카드를 필터링하는 로직 추가
        console.log('Filtering by:', type);
    }
    
    // 채팅하기 버튼 클릭
    const chatButtons = document.querySelectorAll('.action-btn.chat');
    chatButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.status-card');
            
            // 모든 카드와 채팅 버튼의 active 제거
            document.querySelectorAll('.status-card').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.action-btn.chat').forEach(b => b.classList.remove('active'));
            
            // 클릭한 카드와 버튼에 active 추가
            card.classList.add('active');
            this.classList.add('active');
            
            // 채팅방 정보 업데이트
            updateChatRoom(card);
        });
    });
    
    // 문의하기 버튼 클릭
    const inquiryButtons = document.querySelectorAll('.action-btn.inquiry');
    inquiryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 문의하기 페이지로 이동 또는 모달 오픈
            window.location.href = 'inquiry.html';
        });
    });
    
    // 채팅방 정보 업데이트
    function updateChatRoom(card) {
        const location = card.querySelector('.location').textContent;
        const locationTag = document.querySelector('.location-tag');
        locationTag.textContent = `${location} 180번`;
        
        // 채팅 메시지 초기화 또는 로드
        loadChatMessages(location);
    }
    
    // 채팅 메시지 로드
    function loadChatMessages(location) {
        // 실제 구현 시 서버에서 메시지 로드
        console.log('Loading messages for:', location);
    }
    
    // 채팅 전송
    const chatInput = document.querySelector('.chat-input');
    const sendBtn = document.querySelector('.send-btn');
    
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            // 메시지 추가
            addMessageToChat({
                author: '나',
                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                content: message
            });
            
            // 입력창 초기화
            chatInput.value = '';
            
            // 서버로 메시지 전송 (실제 구현 시)
            // sendToServer(message);
        }
    }
    
    // 채팅 메시지 추가
    function addMessageToChat(data) {
        const messagesContainer = document.querySelector('.chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `
            <div class="message-info">
                <span class="author">${data.author}</span>
                <span class="time">${data.time}</span>
            </div>
            <div class="message-content">${data.content}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // 공지사항 닫기
    const closeBtn = document.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        const notice = document.querySelector('.chat-notice');
        notice.style.display = 'none';
    });
    
    // 새로글쓰기 버튼
    const newPostBtn = document.querySelector('.new-post-btn');
    newPostBtn.addEventListener('click', function() {
        // 새 글 작성 페이지로 이동 또는 모달 오픈
        window.location.href = 'new-post.html';
    });
    
    // 실시간 시간 업데이트
    function updateTime() {
        const dateTime = document.querySelector('.date-time');
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        dateTime.textContent = `오늘 ${hours}:${minutes} 기준`;
    }
    
    // 초기 시간 설정 및 1분마다 업데이트
    updateTime();
    setInterval(updateTime, 60000);
});