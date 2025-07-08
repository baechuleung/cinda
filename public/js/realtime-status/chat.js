// 채팅 페이지 전용 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 location 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location') || '알 수 없음';
    
    // 채팅방 정보 업데이트
    const chatHeader = document.querySelector('.chat-header h2');
    if (chatHeader) {
        chatHeader.textContent = `${location} 채팅방`;
    }
    
    // 채팅 메시지 전송
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message';
            messageDiv.innerHTML = `
                <div class="message-info">
                    <span class="author">나</span>
                    <span class="time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="message-content">${message}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            messageInput.value = '';
        }
    }
    
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});