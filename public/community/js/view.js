import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, setDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;
let postId = null;
let postData = null;
let commentsUnsubscribe = null;

// URL 파라미터에서 게시글 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
postId = urlParams.get('id');

if (!postId) {
    alert('잘못된 접근입니다.');
    window.location.href = 'list.html';
}

// 조회수 증가 함수
async function incrementViewCount() {
    try {
        const userIp = await getUserIP();
        const viewId = `${postId}_${userIp}`;
        
        // post_views 컬렉션에서 이미 조회했는지 확인
        const viewDoc = await getDoc(doc(db, 'post_views', viewId));
        
        if (!viewDoc.exists()) {
            // 첫 조회인 경우
            await setDoc(doc(db, 'post_views', viewId), {
                postId: postId,
                ipAddress: userIp,
                viewedAt: serverTimestamp()
            });
            
            // 조회수 증가
            await updateDoc(doc(db, 'community_posts', postId), {
                views: increment(1)
            });
        }
    } catch (error) {
        console.error('조회수 증가 오류:', error);
    }
}

// 사용자 IP 가져오기 (간단한 방법)
async function getUserIP() {
    try {
        // 실제로는 서버에서 IP를 가져와야 하지만, 
        // 클라이언트에서는 임시로 사용자 UID를 사용
        return currentUser ? currentUser.uid : 'anonymous_' + Date.now();
    } catch (error) {
        return 'anonymous_' + Date.now();
    }
}

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = '/auth/login.html';
        return;
    }
    
    // 상세보기 권한 확인
    let hasViewPermission = false;
    
    // admin_users 확인
    const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
    if (adminDoc.exists()) {
        hasViewPermission = true;
    } else {
        // individual_users의 gender 확인
        const individualDoc = await getDoc(doc(db, 'individual_users', user.uid));
        if (individualDoc.exists() && individualDoc.data().gender === 'female') {
            hasViewPermission = true;
        }
    }
    
    if (!hasViewPermission) {
        alert('게시글을 볼 수 있는 권한이 없습니다.');
        window.location.href = 'list.html';
        return;
    }
    
    // 게시글 로드
    await loadPost();
    
    // 조회수 증가
    await incrementViewCount();
    
    // 댓글 로드 및 실시간 리스닝
    loadComments();
    
    // 댓글 작성 버튼 이벤트 (권한이 있는 사용자만)
    document.getElementById('commentSubmit').addEventListener('click', submitComment);
    document.getElementById('commentInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitComment();
        }
    });
});

// 게시글 로드
async function loadPost() {
    try {
        const postDoc = await getDoc(doc(db, 'community_posts', postId));
        
        if (!postDoc.exists()) {
            alert('존재하지 않는 게시글입니다.');
            window.location.href = 'list.html';
            return;
        }
        
        postData = { id: postDoc.id, ...postDoc.data() };
        
        // 게시글 표시
        displayPost();
        
        // 수정/삭제 버튼 표시 여부
        if (currentUser && currentUser.uid === postData.authorId) {
            document.getElementById('editBtn').style.display = 'inline-block';
            document.getElementById('deleteBtn').style.display = 'inline-block';
            
            // 버튼 이벤트 연결
            document.getElementById('editBtn').addEventListener('click', () => {
                window.location.href = `edit.html?id=${postId}`;
            });
            
            document.getElementById('deleteBtn').addEventListener('click', deletePost);
        }
        
    } catch (error) {
        console.error('게시글 로드 오류:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다.');
    }
}

// 게시글 표시
function displayPost() {
    document.getElementById('postTitle').textContent = postData.title;
    document.getElementById('postAuthor').textContent = postData.authorName;
    document.getElementById('postDate').textContent = formatDate(postData.createdAt);
    document.getElementById('postViews').textContent = `조회 ${postData.views || 0}`;
    document.getElementById('postContent').textContent = postData.content;
    
    // 이미지 표시
    if (postData.images && postData.images.length > 0) {
        const imagesContainer = document.getElementById('postImages');
        imagesContainer.innerHTML = postData.images.map(url => 
            `<img src="${url}" alt="첨부 이미지">`
        ).join('');
    }
}

// 게시글 삭제
async function deletePost() {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        // 댓글들도 함께 삭제
        const commentsQuery = query(
            collection(db, 'community_comments'),
            where('postId', '==', postId)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        
        const deletePromises = [];
        commentsSnapshot.forEach((doc) => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        
        // 게시글과 댓글 삭제
        deletePromises.push(deleteDoc(doc(db, 'community_posts', postId)));
        await Promise.all(deletePromises);
        
        alert('게시글이 삭제되었습니다.');
        window.location.href = 'list.html';
        
    } catch (error) {
        console.error('게시글 삭제 오류:', error);
        alert('게시글 삭제 중 오류가 발생했습니다.');
    }
}

// 댓글 로드 및 실시간 리스닝
function loadComments() {
    const commentsQuery = query(
        collection(db, 'community_comments'),
        where('postId', '==', postId),
        orderBy('createdAt', 'asc')
    );
    
    commentsUnsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const comments = [];
        snapshot.forEach((doc) => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayComments(comments);
        updateCommentCount(comments.length);
    });
}

// 댓글 표시
function displayComments(comments) {
    const commentList = document.getElementById('commentList');
    
    if (comments.length === 0) {
        commentList.innerHTML = '<p class="no-comments">등록된 댓글이 없습니다.</p>';
        return;
    }
    
    commentList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${escapeHtml(comment.authorName)}</span>
                <span class="comment-date">${formatDate(comment.createdAt)}</span>
                ${currentUser && currentUser.uid === comment.authorId ? 
                    `<button class="comment-delete-btn" onclick="deleteComment('${comment.id}')">삭제</button>` : ''}
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
        </div>
    `).join('');
}

// 댓글 수 업데이트
async function updateCommentCount(count) {
    document.getElementById('commentCount').textContent = count;
    
    // 게시글의 댓글 수도 업데이트
    try {
        await updateDoc(doc(db, 'community_posts', postId), {
            commentCount: count
        });
    } catch (error) {
        console.error('댓글 수 업데이트 오류:', error);
    }
}

// 댓글 작성
async function submitComment() {
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();
    
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    try {
        // 사용자 정보 가져오기
        let authorName = currentUser.displayName || '';
        
        if (!authorName) {
            const individualDoc = await getDoc(doc(db, 'individual_users', currentUser.uid));
            if (individualDoc.exists()) {
                authorName = individualDoc.data().nickname || individualDoc.data().name || `사용자${currentUser.uid.slice(-4)}`;
            } else {
                const businessDoc = await getDoc(doc(db, 'business_users', currentUser.uid));
                if (businessDoc.exists()) {
                    authorName = businessDoc.data().nickname || businessDoc.data().name || `사용자${currentUser.uid.slice(-4)}`;
                }
            }
        }
        
        // 댓글 데이터
        const commentData = {
            postId: postId,
            content: content,
            authorId: currentUser.uid,
            authorName: authorName,
            createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'community_comments'), commentData);
        
        // 입력창 초기화
        commentInput.value = '';
        
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        alert('댓글 작성 중 오류가 발생했습니다.');
    }
}

// 댓글 삭제
window.deleteComment = async function(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'community_comments', commentId));
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        alert('댓글 삭제 중 오류가 발생했습니다.');
    }
};

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 24시간 이내면 시간으로 표시
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const minutes = Math.floor(diff / (60 * 1000));
        
        if (hours > 0) return `${hours}시간 전`;
        if (minutes > 0) return `${minutes}분 전`;
        return '방금 전';
    }
    
    // 그 외에는 날짜로 표시
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// HTML 이스케이프
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 페이지 언로드 시 리스너 정리
window.addEventListener('beforeunload', () => {
    if (commentsUnsubscribe) {
        commentsUnsubscribe();
    }
});