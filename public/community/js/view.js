// 파일 경로: /public/community/js/view.js

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, deleteDoc, updateDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp, increment, setDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

// 페이지 로드 시 커뮤니티 헤더 추가
document.addEventListener('DOMContentLoaded', function() {
    // 커뮤니티 헤더가 없으면 추가
    const container = document.querySelector('.community-container');
    if (container && !container.querySelector('.community-header')) {
        const headerHTML = `
            <div class="community-header">
                <h1>신다 수다방</h1>
                <p class="subtitle">함께 나누는 이야기, 함께 만드는 커뮤니티</p>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', headerHTML);
    }
});

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (!user) {
        // 로그인하지 않은 사용자도 게시글은 볼 수 있음
        document.getElementById('commentInput').disabled = true;
        document.getElementById('commentInput').placeholder = '로그인 후 댓글을 작성할 수 있습니다.';
        document.getElementById('commentSubmit').disabled = true;
    } else {
        // 글쓰기 권한 확인
        let hasCommentPermission = false;
        
        // admin_users 확인
        try {
            const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
            if (adminDoc.exists()) {
                hasCommentPermission = true;
            }
        } catch (error) {
            // 오류 무시
        }
        
        // admin이 아닌 경우 individual_users 확인
        if (!hasCommentPermission) {
            try {
                const individualDoc = await getDoc(doc(db, 'individual_users', user.uid));
                if (individualDoc.exists()) {
                    const userData = individualDoc.data();
                    if (userData.gender === 'female') {
                        hasCommentPermission = true;
                    }
                }
            } catch (error) {
                // 오류 무시
            }
        }
        
        // 권한에 따라 댓글 작성 가능 여부 설정
        if (hasCommentPermission) {
            document.getElementById('commentInput').disabled = false;
            document.getElementById('commentSubmit').disabled = false;
        } else {
            document.getElementById('commentInput').disabled = true;
            document.getElementById('commentInput').placeholder = '댓글 작성 권한이 없습니다.';
            document.getElementById('commentSubmit').disabled = true;
        }
    }
    
    if (!postId) {
        alert('잘못된 접근입니다.');
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
        if (e.key === 'Enter') {
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
        
        // 게시글 번호 계산을 위해 전체 게시글 가져오기
        try {
            const allPostsQuery = query(
                collection(db, 'community_posts'),
                orderBy('createdAt', 'desc')
            );
            const allPostsSnapshot = await getDocs(allPostsQuery);
            
            // 공지사항 제외한 일반 게시글만 필터링
            const normalPosts = [];
            allPostsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.isNotice) {
                    normalPosts.push({
                        id: doc.id,
                        createdAt: data.createdAt
                    });
                }
            });
            
            // 현재 게시글의 순서 찾기
            const postIndex = normalPosts.findIndex(post => post.id === postId);
            const postNumber = normalPosts.length - postIndex;
            
            // 게시글 번호 표시
            if (postData.isNotice) {
                document.getElementById('postNumber').innerHTML = '<span class="notice-badge">공지</span>';
            } else {
                document.getElementById('postNumber').textContent = `NO.${postNumber}`;
            }
        } catch (error) {
            console.error('게시글 번호 계산 오류:', error);
            document.getElementById('postNumber').textContent = `NO.1`;
        }
        
        // 나머지 게시글 정보 표시
        document.getElementById('postTitle').textContent = postData.title;
        document.getElementById('postAuthor').textContent = postData.authorName;
        document.getElementById('postDate').textContent = formatDate(postData.createdAt);
        document.getElementById('postViews').textContent = postData.views || 0;
        document.getElementById('postLikes').textContent = postData.likeCount || 0;
        document.getElementById('postComments').textContent = postData.commentCount || 0;
        document.getElementById('postContent').textContent = postData.content;
        
        // 이미지 표시
        if (postData.images && postData.images.length > 0) {
            const imagesContainer = document.getElementById('postImages');
            imagesContainer.innerHTML = postData.images.map(url => 
                `<img src="${url}" alt="첨부 이미지">`
            ).join('');
        }
        
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
        
        // 좋아요 표시
        displayReactions();
        
    } catch (error) {
        console.error('게시글 로드 오류:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다.');
    }
}

// 조회수 증가
async function incrementViewCount() {
    try {
        await updateDoc(doc(db, 'community_posts', postId), {
            views: increment(1)
        });
    } catch (error) {
        console.error('조회수 증가 오류:', error);
    }
}

// 게시글 삭제
async function deletePost() {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        // 댓글들도 함께 삭제 (하위 컬렉션에서)
        const commentsQuery = query(
            collection(db, 'community_posts', postId, 'comments')
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
    // 하위 컬렉션에서 댓글 로드
    const commentsQuery = query(
        collection(db, 'community_posts', postId, 'comments'),
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
    
    // 대댓글 구조로 정리 (parentId가 없는 것이 부모 댓글)
    const parentComments = comments.filter(comment => !comment.parentId);
    const childComments = comments.filter(comment => comment.parentId);
    
    commentList.innerHTML = parentComments.map(comment => {
        const replies = childComments.filter(child => child.parentId === comment.id);
        
        return `
            <div class="comment-wrapper">
                <div class="comment-item ${comment.parentId ? 'reply-comment' : ''}">
                    <div class="comment-header">
                        <div class="comment-info">
                            <span class="comment-author">${escapeHtml(comment.authorName)}</span>
                            <span class="comment-date">${formatDate(comment.createdAt)}</span>
                        </div>
                        <div class="comment-actions">
                            <button class="reply-btn" onclick="showReplyForm('${comment.id}')">답글</button>
                            <button class="report-comment-btn" onclick="reportComment('${comment.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <path d="M2.66536 12.6667H13.332V11.3333H2.66536V12.6667ZM6.66536 6.66667C6.66536 6.3 6.79592 5.98611 7.05703 5.725C7.31814 5.46389 7.63203 5.33333 7.9987 5.33333C8.18759 5.33333 8.34592 5.26944 8.4737 5.14167C8.60148 5.01389 8.66536 4.85556 8.66536 4.66667C8.66536 4.47778 8.60148 4.31944 8.4737 4.19167C8.34592 4.06389 8.18759 4 7.9987 4C7.26536 4 6.63759 4.26111 6.11536 4.78333C5.59314 5.30556 5.33203 5.93333 5.33203 6.66667V8C5.33203 8.18889 5.39592 8.34722 5.5237 8.475C5.65148 8.60278 5.80981 8.66667 5.9987 8.66667C6.18759 8.66667 6.34592 8.60278 6.4737 8.475C6.60148 8.34722 6.66536 8.18889 6.66536 8V6.66667ZM4.66536 10H11.332V6.66667C11.332 5.74444 11.007 4.95833 10.357 4.30833C9.70703 3.65833 8.92092 3.33333 7.9987 3.33333C7.07648 3.33333 6.29036 3.65833 5.64036 4.30833C4.99036 4.95833 4.66536 5.74444 4.66536 6.66667V10ZM2.66536 14C2.2987 14 1.98481 13.8694 1.7237 13.6083C1.46259 13.3472 1.33203 13.0333 1.33203 12.6667V11.3333C1.33203 10.9667 1.46259 10.6528 1.7237 10.3917C1.98481 10.1306 2.2987 10 2.66536 10H3.33203V6.66667C3.33203 5.36667 3.78481 4.26389 4.69036 3.35833C5.59592 2.45278 6.6987 2 7.9987 2C9.2987 2 10.4015 2.45278 11.307 3.35833C12.2126 4.26389 12.6654 5.36667 12.6654 6.66667V10H13.332C13.6987 10 14.0126 10.1306 14.2737 10.3917C14.5348 10.6528 14.6654 10.9667 14.6654 11.3333V12.6667C14.6654 13.0333 14.5348 13.3472 14.2737 13.6083C14.0126 13.8694 13.6987 14 13.332 14H2.66536Z" fill="#999999"/>
                                </svg>
                                신고
                            </button>
                            ${currentUser && currentUser.uid === comment.authorId ? 
                                `<button class="comment-delete-btn" onclick="deleteComment('${comment.id}')">삭제</button>` : ''}
                        </div>
                    </div>
                    <div class="comment-content">${escapeHtml(comment.content)}</div>
                </div>
                <div id="reply-form-${comment.id}" class="reply-form" style="display: none;">
                    <textarea class="reply-input" placeholder="답글을 입력하세요" rows="2"></textarea>
                    <div class="reply-actions">
                        <button class="reply-submit-btn" onclick="submitReply('${comment.id}')">등록</button>
                        <button class="reply-cancel-btn" onclick="hideReplyForm('${comment.id}')">취소</button>
                    </div>
                </div>
                ${replies.length > 0 ? `
                    <div class="replies">
                        ${replies.map(reply => `
                            <div class="comment-item reply-comment">
                                <div class="comment-header">
                                    <div class="comment-info">
                                        <svg class="reply-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M15 10L20 15L15 20"></path>
                                            <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
                                        </svg>
                                        <span class="comment-author">${escapeHtml(reply.authorName)}</span>
                                        <span class="comment-date">${formatDate(reply.createdAt)}</span>
                                    </div>
                                    <div class="comment-actions">
                                        <button class="report-comment-btn" onclick="reportComment('${reply.id}')">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M2.66536 12.6667H13.332V11.3333H2.66536V12.6667ZM6.66536 6.66667C6.66536 6.3 6.79592 5.98611 7.05703 5.725C7.31814 5.46389 7.63203 5.33333 7.9987 5.33333C8.18759 5.33333 8.34592 5.26944 8.4737 5.14167C8.60148 5.01389 8.66536 4.85556 8.66536 4.66667C8.66536 4.47778 8.60148 4.31944 8.4737 4.19167C8.34592 4.06389 8.18759 4 7.9987 4C7.26536 4 6.63759 4.26111 6.11536 4.78333C5.59314 5.30556 5.33203 5.93333 5.33203 6.66667V8C5.33203 8.18889 5.39592 8.34722 5.5237 8.475C5.65148 8.60278 5.80981 8.66667 5.9987 8.66667C6.18759 8.66667 6.34592 8.60278 6.4737 8.475C6.60148 8.34722 6.66536 8.18889 6.66536 8V6.66667ZM4.66536 10H11.332V6.66667C11.332 5.74444 11.007 4.95833 10.357 4.30833C9.70703 3.65833 8.92092 3.33333 7.9987 3.33333C7.07648 3.33333 6.29036 3.65833 5.64036 4.30833C4.99036 4.95833 4.66536 5.74444 4.66536 6.66667V10ZM2.66536 14C2.2987 14 1.98481 13.8694 1.7237 13.6083C1.46259 13.3472 1.33203 13.0333 1.33203 12.6667V11.3333C1.33203 10.9667 1.46259 10.6528 1.7237 10.3917C1.98481 10.1306 2.2987 10 2.66536 10H3.33203V6.66667C3.33203 5.36667 3.78481 4.26389 4.69036 3.35833C5.59592 2.45278 6.6987 2 7.9987 2C9.2987 2 10.4015 2.45278 11.307 3.35833C12.2126 4.26389 12.6654 5.36667 12.6654 6.66667V10H13.332C13.6987 10 14.0126 10.1306 14.2737 10.3917C14.5348 10.6528 14.6654 10.9667 14.6654 11.3333V12.6667C14.6654 13.0333 14.5348 13.3472 14.2737 13.6083C14.0126 13.8694 13.6987 14 13.332 14H2.66536Z" fill="#999999"/>
                                            </svg>
                                            신고
                                        </button>
                                        ${currentUser && currentUser.uid === reply.authorId ? 
                                            `<button class="comment-delete-btn" onclick="deleteComment('${reply.id}')">삭제</button>` : ''}
                                    </div>
                                </div>
                                <div class="comment-content">${escapeHtml(reply.content)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 댓글 수 업데이트
async function updateCommentCount(count) {
    const commentCountElement = document.getElementById('commentCount');
    if (commentCountElement) {
        commentCountElement.textContent = count;
    }
    
    // 헤더의 댓글 수도 업데이트 (요소가 있을 경우에만)
    const postCommentsElement = document.getElementById('postComments');
    if (postCommentsElement) {
        postCommentsElement.textContent = count;
    }
    
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
        
        // 댓글 데이터 (postId 제거 - 하위 컬렉션이므로 불필요)
        const commentData = {
            content: content,
            authorId: currentUser.uid,
            authorName: authorName,
            createdAt: serverTimestamp()
        };
        
        // 하위 컬렉션에 댓글 추가
        await addDoc(collection(db, 'community_posts', postId, 'comments'), commentData);
        
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
        // 하위 컬렉션에서 댓글 삭제
        await deleteDoc(doc(db, 'community_posts', postId, 'comments', commentId));
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

// 좋아요 표시
async function displayReactions() {
    const likeCount = postData.likeCount || 0;
    
    // 좋아요 버튼의 카운트
    const likeCountElement = document.getElementById('likeCount');
    if (likeCountElement) {
        likeCountElement.textContent = likeCount;
    }
    
    // 헤더의 좋아요 수도 업데이트 (요소가 있을 경우에만)
    const postLikesElement = document.getElementById('postLikes');
    if (postLikesElement) {
        postLikesElement.textContent = likeCount;
    }
    
    // 현재 사용자의 반응 확인
    if (currentUser) {
        const reactionDoc = await getDoc(doc(db, 'post_reactions', `${postId}_${currentUser.uid}`));
        const likeBtn = document.getElementById('likeBtn');
        if (likeBtn) {
            if (reactionDoc.exists()) {
                const reaction = reactionDoc.data();
                if (reaction.type === 'like') {
                    likeBtn.classList.add('active');
                }
            } else {
                likeBtn.classList.remove('active');
            }
        }
    }
}

// 좋아요 처리
window.handleLike = async function() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    try {
        const reactionId = `${postId}_${currentUser.uid}`;
        const reactionDoc = await getDoc(doc(db, 'post_reactions', reactionId));
        
        if (reactionDoc.exists()) {
            // 이미 좋아요한 경우 - 취소
            await deleteDoc(doc(db, 'post_reactions', reactionId));
            await updateDoc(doc(db, 'community_posts', postId), {
                likeCount: increment(-1)
            });
            postData.likeCount = (postData.likeCount || 1) - 1;
        } else {
            // 새로운 좋아요
            await setDoc(doc(db, 'post_reactions', reactionId), {
                postId: postId,
                userId: currentUser.uid,
                type: 'like',
                createdAt: serverTimestamp()
            });
            await updateDoc(doc(db, 'community_posts', postId), {
                likeCount: increment(1)
            });
            postData.likeCount = (postData.likeCount || 0) + 1;
        }
        
        displayReactions();
    } catch (error) {
        console.error('좋아요 처리 오류:', error);
        alert('처리 중 오류가 발생했습니다.');
    }
};

// 신고하기 기능
window.reportPost = async function() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    if (confirm('이 게시글을 신고하시겠습니까?')) {
        // TODO: 신고 기능 구현
        alert('신고가 접수되었습니다.');
    }
};

// 댓글 신고하기
window.reportComment = async function(commentId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    if (confirm('이 댓글을 신고하시겠습니까?')) {
        // TODO: 신고 기능 구현
        alert('신고가 접수되었습니다.');
    }
};

// 답글 폼 표시
window.showReplyForm = function(commentId) {
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    if (replyForm) {
        replyForm.style.display = 'block';
        replyForm.querySelector('.reply-input').focus();
    }
};

// 답글 폼 숨기기
window.hideReplyForm = function(commentId) {
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    if (replyForm) {
        replyForm.style.display = 'none';
        replyForm.querySelector('.reply-input').value = '';
    }
};

// 답글 작성
window.submitReply = async function(parentId) {
    const replyForm = document.getElementById(`reply-form-${parentId}`);
    const replyInput = replyForm.querySelector('.reply-input');
    const content = replyInput.value.trim();
    
    if (!content) {
        alert('답글 내용을 입력해주세요.');
        return;
    }
    
    if (!currentUser) {
        alert('로그인이 필요합니다.');
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
        
        // 답글 데이터
        const replyData = {
            content: content,
            authorId: currentUser.uid,
            authorName: authorName,
            parentId: parentId,  // 부모 댓글 ID
            createdAt: serverTimestamp()
        };
        
        // 하위 컬렉션에 답글 추가
        await addDoc(collection(db, 'community_posts', postId, 'comments'), replyData);
        
        // 폼 숨기기
        hideReplyForm(parentId);
        
    } catch (error) {
        console.error('답글 작성 오류:', error);
        alert('답글 작성 중 오류가 발생했습니다.');
    }
};