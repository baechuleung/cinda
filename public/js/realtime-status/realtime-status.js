// 페이지 기능
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // 필터 버튼 기능
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filterType = this.dataset.filter;
            filterCardsByStatus(filterType);
        });
    });
    
    // 검색 기능
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    function performSearch() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            console.log('Searching for:', searchTerm);
        }
    }
    
    // 카드 상태별 필터링
    function filterCardsByStatus(status) {
        console.log('Filtering by status:', status);
    }
    
    // 채팅하기 버튼 클릭
    const chatButtons = document.querySelectorAll('.action-btn.chat');
    chatButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const card = this.closest('.status-card');
            const location = this.dataset.location || card.querySelector('.location').textContent;
            const rightSection = document.querySelector('.right-section');
            const mainContainer = document.querySelector('.main-container');
            
            console.log('Chat button clicked for:', location);
            
            // PC에서만 동작
            if (window.innerWidth > 768) {
                // 이미 활성화된 채팅 버튼을 다시 클릭하면 닫기
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                    card.classList.remove('active');
                    rightSection.style.display = 'none';
                    mainContainer.classList.remove('right-active');
                    return;
                }
                
                // 모든 active 상태 제거
                document.querySelectorAll('.status-card').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
                
                // 현재 카드와 버튼 활성화
                card.classList.add('active');
                this.classList.add('active');
                
                // 메인 컨테이너에 right-active 클래스 추가
                mainContainer.classList.add('right-active');
                
                // 오른쪽 섹션에 채팅 표시
                rightSection.innerHTML = `
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
                
                // 오른쪽 섹션 표시
                rightSection.style.display = 'flex';
                
                // 채팅 입력 이벤트 설정
                setupChatEvents();
            }
        });
    });
    
    // 문의하기 버튼 클릭
    const inquiryButtons = document.querySelectorAll('.action-btn.inquiry');
    inquiryButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const card = this.closest('.status-card');
            const location = this.dataset.location || card.querySelector('.location').textContent;
            const rightSection = document.querySelector('.right-section');
            const mainContainer = document.querySelector('.main-container');
            
            console.log('Inquiry button clicked for:', location);
            
            if (window.innerWidth > 768) {
                // 이미 활성화된 문의 버튼을 다시 클릭하면 닫기
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                    card.classList.remove('active');
                    rightSection.style.display = 'none';
                    mainContainer.classList.remove('right-active');
                    return;
                }
                
                // 모든 active 상태 제거
                document.querySelectorAll('.status-card').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
                
                // 현재 카드와 버튼 활성화
                card.classList.add('active');
                this.classList.add('active');
                
                // 메인 컨테이너에 right-active 클래스 추가
                mainContainer.classList.add('right-active');
                
                // 오른쪽 섹션에 문의 폼 표시
                rightSection.innerHTML = `
                    <div class="inquiry-header">
                        <h3>문의하기</h3>
                        <span class="location-tag">${location}</span>
                    </div>
                    
                    <div class="inquiry-form-container">
                        <form class="right-inquiry-form">
                            <div class="form-group">
                                <label>문의 유형</label>
                                <select required>
                                    <option value="">선택해주세요</option>
                                    <option value="reservation">예약 문의</option>
                                    <option value="service">서비스 문의</option>
                                    <option value="price">가격 문의</option>
                                    <option value="other">기타 문의</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>이름</label>
                                <input type="text" placeholder="이름을 입력해주세요" required>
                            </div>
                            <div class="form-group">
                                <label>연락처</label>
                                <input type="tel" placeholder="010-0000-0000" required>
                            </div>
                            <div class="form-group">
                                <label>문의 내용</label>
                                <textarea rows="4" placeholder="문의하실 내용을 입력해주세요" required></textarea>
                            </div>
                            <button type="submit" class="submit-inquiry-btn">문의하기</button>
                        </form>
                    </div>
                `;
                
                // 오른쪽 섹션 표시
                rightSection.style.display = 'flex';
            }
        });
    });
    
    // 채팅 이벤트 설정 함수
    function setupChatEvents() {
        const chatInput = document.querySelector('.chat-input');
        const sendBtn = document.querySelector('.send-btn');
        
        if (sendBtn) {
            sendBtn.onclick = function() {
                sendMessage();
            };
        }
        
        if (chatInput) {
            chatInput.onkeypress = function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            };
        }
    }
    
    // 메시지 전송
    function sendMessage() {
        const chatInput = document.querySelector('.chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (message) {
            addMessageToChat({
                author: '나',
                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                content: message
            });
            
            chatInput.value = '';
        }
    }
    
    // 채팅 메시지 추가
    function addMessageToChat(data) {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
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
    }
    
    // 실시간 시간 업데이트
    function updateTime() {
        const dateTime = document.querySelector('.date-time');
        if (dateTime) {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            dateTime.textContent = `오늘 ${hours}:${minutes} 기준`;
        }
    }
    
    // 초기 시간 설정 및 1분마다 업데이트
    updateTime();
    setInterval(updateTime, 60000);
});