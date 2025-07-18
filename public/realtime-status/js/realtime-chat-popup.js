import { db, rtdb, auth } from '/js/firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, onValue, serverTimestamp, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 채팅 팝업 기능
export function initializeChatPopup() {
    const chatButtons = document.querySelectorAll('.action-btn.chat');
    chatButtons.forEach(btn => {
        btn.addEventListener('click', openChatPopup);
    });
}

async function openChatPopup(e) {
    e.preventDefault();
    
    // 로그인 확인
    if (!auth.currentUser) {
        alert('로그인 후 채팅을 이용할 수 있습니다.');
        return;
    }
    
    const card = this.closest('.status-card');
    const location = card.querySelector('.location').textContent;
    const storeId = this.getAttribute('data-store-id');
    
    // Firestore에서 chatRoomId 가져오기
    let chatRoomId = null;
    try {
        const storeDoc = await getDoc(doc(db, 'realtime-status', storeId));
        if (storeDoc.exists()) {
            chatRoomId = storeDoc.data().chatRoomId;
        }
    } catch (error) {
        console.error('채팅방 ID 가져오기 오류:', error);
    }
    
    if (!chatRoomId) {
        alert('채팅방을 찾을 수 없습니다.');
        return;
    }
    
    // 모바일/PC 분기
    if (window.innerWidth <= 768) {
        openMobileChat(card, location, this, chatRoomId);
    } else {
        openDesktopChat(card, location, this, chatRoomId);
    }
}

// 외부 클릭 핸들러
function handleOutsideClick(e) {
    const chatArea = document.querySelector('.mobile-action-area');
    const chatContainer = document.querySelector('.mobile-action-container');
    
    if (chatArea && chatContainer) {
        // 채팅 컨테이너 내부를 클릭한 경우가 아니면 닫기
        if (!chatContainer.contains(e.target) && !e.target.closest('.action-btn')) {
            closeAllMobilePopups();
        }
    }
}

// PC 외부 클릭 핸들러
function handleDesktopOutsideClick(e) {
    const rightSection = document.querySelector('.right-section');
    const actionBtn = e.target.closest('.action-btn');
    
    if (rightSection && rightSection.style.display !== 'none') {
        // 오른쪽 섹션이나 액션 버튼을 클릭한 경우가 아니면 닫기
        if (!rightSection.contains(e.target) && !actionBtn) {
            closeDesktopPopup();
        }
    }
}

// 모바일 채팅
function openMobileChat(card, location, button, chatRoomId) {
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
    const chatArea = createMobileChatArea(location, chatRoomId);
    
    // body에 직접 추가 (fixed position이므로)
    document.body.appendChild(chatArea);
    
    // 이벤트 연결
    setupChatEvents(chatArea, chatRoomId);
    
    // 실시간 메시지 리스닝 시작
    startListeningToMessages(chatRoomId, chatArea);
    
    // 외부 클릭 이벤트 추가
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 100);
}

// PC 채팅
function openDesktopChat(card, location, button, chatRoomId) {
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
    rightSection.innerHTML = createChatHTML(location, chatRoomId);
    rightSection.style.display = 'flex';
    
    // 이벤트 연결
    setupChatEvents(rightSection, chatRoomId);
    
    // 실시간 메시지 리스닝 시작
    startListeningToMessages(chatRoomId, rightSection);
    
    // PC에서도 외부 클릭 시 닫기
    setTimeout(() => {
        document.addEventListener('click', handleDesktopOutsideClick);
    }, 100);
}

// 모바일 채팅 영역 생성
function createMobileChatArea(location, chatRoomId) {
    const area = document.createElement('div');
    area.className = 'mobile-action-area';
    area.innerHTML = createChatHTML(location, chatRoomId);
    return area;
}

// 채팅 HTML 생성
function createChatHTML(location, chatRoomId) {
    return `
        <div class="mobile-action-container" data-chatroom-id="${chatRoomId}">
            <div class="chat-header">
                <h3>실시간 채팅톡</h3>
            </div>
            
            <div class="chat-info">
                <span class="store-info">${location} <span class="count">0명</span></span>
            </div>
            
            <div class="chat-content-area">
                <div class="chat-messages">
                    <div class="chat-notice-box">
                        <span class="notice-label">공지</span>
                        <span class="notice-text">이곳은 익명 채팅방입니다. 욕설 및 비방은 자제해주세요.</span>
                    </div>
                </div>
            </div>
            
            <div class="chat-input-area">
                <button class="chat-close-btn" onclick="closeAllMobilePopups()">×</button>
                <input type="text" placeholder="메세지를 입력하세요..." class="chat-input">
                <button class="send-btn">전송</button>
            </div>
        </div>
    `;
}

// 채팅 이벤트 설정
function setupChatEvents(container, chatRoomId) {
    const input = container.querySelector('.chat-input');
    const sendBtn = container.querySelector('.send-btn');
    
    // 로그인 상태 확인하여 버튼과 입력창 활성화/비활성화
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // 로그인하지 않은 경우
            if (input) {
                input.disabled = true;
                input.placeholder = "로그인 후 채팅할 수 있습니다";
            }
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.style.opacity = '0.5';
                sendBtn.style.cursor = 'not-allowed';
            }
        } else {
            // 로그인한 경우
            if (input) {
                input.disabled = false;
                input.placeholder = "메세지를 입력하세요...";
            }
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.style.opacity = '1';
                sendBtn.style.cursor = 'pointer';
            }
        }
    });
    
    if (sendBtn) {
        // 모바일에서는 touchend 이벤트 사용
        if (window.innerWidth <= 768) {
            sendBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!sendBtn.disabled) {
                    sendMessage(container, chatRoomId);
                }
            });
        } else {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!sendBtn.disabled) {
                    sendMessage(container, chatRoomId);
                }
            });
        }
    }
    
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !input.disabled) {
                e.preventDefault();
                sendMessage(container, chatRoomId);
            }
        });
    }
    
    // 모바일에서 채팅 영역 외부 클릭 시 키패드 내리기
    if (window.innerWidth <= 768) {
        const chatContainer = container.querySelector('.mobile-action-container');
        if (chatContainer) {
            // 채팅 컨테이너 외부 클릭 감지
            document.addEventListener('click', function handleOutsideClick(e) {
                // 채팅 컨테이너와 그 하위 요소가 아닌 곳을 클릭한 경우
                if (!chatContainer.contains(e.target) && !container.contains(e.target)) {
                    if (document.activeElement === input) {
                        input.blur(); // 키패드 내리기
                    }
                }
            });
        }
    }
}

// 메시지 전송
async function sendMessage(container, chatRoomId) {
    // 로그인 확인
    if (!auth.currentUser) {
        alert('로그인 후 채팅할 수 있습니다.');
        return;
    }
    
    const input = container.querySelector('.chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        // 사용자 정보 가져오기 (닉네임)
        let nickname = auth.currentUser.displayName || '';
        
        // displayName이 없으면 Firestore에서 가져오기
        if (!nickname) {
            // 개인회원 확인
            const individualDoc = await getDoc(doc(db, 'individual_users', auth.currentUser.uid));
            if (individualDoc.exists()) {
                nickname = individualDoc.data().nickname || individualDoc.data().name || `사용자${auth.currentUser.uid.slice(-4)}`;
            } else {
                // 기업회원 확인
                const businessDoc = await getDoc(doc(db, 'business_users', auth.currentUser.uid));
                if (businessDoc.exists()) {
                    nickname = businessDoc.data().nickname || businessDoc.data().name || `사용자${auth.currentUser.uid.slice(-4)}`;
                }
            }
        }
        
        // Realtime Database에 메시지 저장
        const messagesRef = ref(rtdb, `chatRooms/${chatRoomId}/messages`);
        await push(messagesRef, {
            content: message,
            timestamp: serverTimestamp(),
            author: nickname,
            userId: auth.currentUser.uid
        });
        
        input.value = '';
        
        // 모바일에서 입력창에 포커스 유지 (키패드 유지)
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                input.focus();
            }, 10);
        }
    } catch (error) {
        console.error('메시지 전송 오류:', error);
        alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    }
}

// 실시간 메시지 리스닝
let messageListeners = new Map();

function startListeningToMessages(chatRoomId, container) {
    const messagesRef = ref(rtdb, `chatRooms/${chatRoomId}/messages`);
    const messagesArea = container.querySelector('.chat-messages');
    const countElement = container.querySelector('.count');
    
    // 기존 리스너 제거
    if (messageListeners.has(chatRoomId)) {
        const oldListener = messageListeners.get(chatRoomId);
        if (oldListener) {
            oldListener();
        }
    }
    
    // 새 리스너 등록
    const unsubscribe = onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val();
        if (!messages) return;
        
        // 기존 메시지 제거 (공지 제외)
        const existingMessages = messagesArea.querySelectorAll('.chat-message');
        existingMessages.forEach(msg => msg.remove());
        
        // 메시지 배열로 변환하고 시간순 정렬
        const messageArray = Object.entries(messages).map(([key, value]) => ({
            id: key,
            ...value
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        // 참여자 수 업데이트
        const uniqueAuthors = new Set(messageArray.map(msg => msg.author));
        countElement.textContent = `${uniqueAuthors.size}명`;
        
        // 메시지 표시
        messageArray.forEach(msg => {
            const isMyMessage = msg.userId === auth.currentUser?.uid;
            const messageDiv = createMessageElement(msg, isMyMessage);
            messagesArea.appendChild(messageDiv);
        });
        
        // 스크롤 하단으로
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
    
    messageListeners.set(chatRoomId, unsubscribe);
}

// 메시지 엘리먼트 생성
function createMessageElement(message, isMyMessage) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isMyMessage ? 'my-message' : ''}`;
    
    const time = formatTimestamp(message.timestamp);
    
    if (isMyMessage) {
        messageDiv.innerHTML = `
            <div class="message-wrapper">
                <span class="time">${time}</span>
                <div class="message-box">
                    <div class="message-content">${message.content}</div>
                </div>
            </div>
        `;
    } else {
        const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${message.author}`;
        messageDiv.innerHTML = `
            <div class="message-header">
                <img src="${avatarUrl}" alt="프로필" class="profile-icon">
                <span class="author">${message.author}</span>
            </div>
            <div class="message-wrapper">
                <div class="message-box">
                    <div class="message-content">${message.content}</div>
                </div>
                <span class="time">${time}</span>
            </div>
        `;
    }
    
    return messageDiv;
}

// 타임스탬프 포맷
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${period} ${displayHours}:${displayMinutes}`;
}

// 모든 모바일 팝업 닫기
function closeAllMobilePopups() {
    document.querySelectorAll('.mobile-action-area').forEach(area => area.remove());
    document.querySelectorAll('.status-card, .action-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    // 외부 클릭 이벤트 제거
    document.removeEventListener('click', handleOutsideClick);
    
    // 메시지 리스너 정리
    messageListeners.forEach((unsubscribe) => {
        if (unsubscribe) unsubscribe();
    });
    messageListeners.clear();
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
    
    // 외부 클릭 이벤트 제거
    document.removeEventListener('click', handleDesktopOutsideClick);
    
    // 메시지 리스너 정리
    messageListeners.forEach((unsubscribe) => {
        if (unsubscribe) unsubscribe();
    });
    messageListeners.clear();
}

// 세션 스토리지에 임시 사용자 ID 저장 부분 제거 (더 이상 필요 없음)

// 전역 함수로 등록
window.closeAllMobilePopups = closeAllMobilePopups;