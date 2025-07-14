// 파일 경로: public/community/js/view.js

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, deleteDoc, updateDoc, addDoc, collection, query, orderBy, onSnapshot, serverTimestamp, increment, setDoc, getDocs, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
                document.getElementById('postNumber').textContent = '공지';
                document.getElementById('postNumber').classList.add('notice');
            } else {
                document.getElementById('postNumber').textContent = `NO.${postNumber}`;
            }
        } catch (error) {
            console.error('게시글 번호 계산 오류:', error);
            document.getElementById('postNumber').textContent = 'NO.1';
        }
        
        // 제목
        document.getElementById('postTitle').textContent = postData.title;
        
        // 작성자 정보
        const authorName = postData.authorName || '알 수 없음';
        document.getElementById('postAuthor').textContent = authorName;
        
        // 작성일
        document.getElementById('postDate').textContent = formatDate(postData.createdAt);
        
        // 조회수
        document.getElementById('postViews').textContent = postData.views || 0;
        
        // 댓글 수
        document.getElementById('postComments').textContent = postData.commentCount || 0;
        
        // 내용
        document.getElementById('postContent').innerHTML = postData.content.replace(/\n/g, '<br>');
        
        // 좋아요 수
        displayReactions();
        
        // 수정/삭제 버튼 표시
        if (currentUser && currentUser.uid === postData.authorId) {
            const editBtn = document.getElementById('editBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            
            if (editBtn) editBtn.style.display = 'inline-flex';
            if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        }
        
    } catch (error) {
        console.error('게시글 로드 오류:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다.');
        window.location.href = 'list.html';
    }
}

// 좋아요 표시
function displayReactions() {
    const likeCount = document.getElementById('likeCount');
    if (likeCount) {
        likeCount.textContent = postData.likeCount || 0;
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

// 날짜 포맷팅
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 오늘이면 시간만 표시
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 어제면 "어제" 표시
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
        return '어제';
    }
    
    // 그 외는 날짜 표시
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

// 댓글 로드 및 실시간 리스닝
function loadComments() {
    // 하위 컬렉션에서 댓글 가져오기
    const commentsQuery = query(
        collection(db, 'community_posts', postId, 'comments'),
        orderBy('createdAt', 'asc')
    );
    
    commentsUnsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const comments = [];
        snapshot.forEach((doc) => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        displayComments(comments);
        updateCommentCount(comments.length);
    });
}

// 댓글 표시
function displayComments(comments) {
    const commentList = document.getElementById('commentList');
    const noCommentsDiv = commentList.querySelector('.no-comments');
    
    // 기존 댓글 제거 (템플릿과 no-comments 제외)
    const existingComments = commentList.querySelectorAll('.comment-wrapper');
    existingComments.forEach(comment => comment.remove());
    
    if (!comments || comments.length === 0) {
        noCommentsDiv.style.display = 'block';
        return;
    }
    
    noCommentsDiv.style.display = 'none';
    
    // 댓글과 답글 구조화
    const topLevelComments = comments.filter(comment => !comment.parentId);
    const replies = comments.filter(comment => comment.parentId);
    
    // 답글을 부모 댓글에 매핑
    const commentMap = {};
    topLevelComments.forEach(comment => {
        commentMap[comment.id] = {
            ...comment,
            replies: replies.filter(reply => reply.parentId === comment.id)
        };
    });
    
    // 템플릿 가져오기
    const commentTemplate = document.getElementById('commentTemplate');
    const replyTemplate = document.getElementById('replyTemplate');
    
    // 각 댓글 렌더링
    Object.values(commentMap).forEach(comment => {
        // 댓글 템플릿 복제
        const commentElement = commentTemplate.content.cloneNode(true);
        
        // 댓글 데이터 설정
        commentElement.querySelector('.comment-author').textContent = comment.authorName;
        commentElement.querySelector('.comment-date').textContent = formatDate(comment.createdAt);
        commentElement.querySelector('.comment-content').textContent = comment.content;
        
        // 버튼 data-comment-id 설정
        const buttons = commentElement.querySelectorAll('button[onclick*="Comment"]');
        buttons.forEach(btn => {
            if (btn.onclick) {
                btn.dataset.commentId = comment.id;
            }
        });
        
        // 답글 버튼 표시/숨김
        const replyBtn = commentElement.querySelector('.reply-btn');
        if (currentUser) {
            replyBtn.style.display = 'inline-flex';
            replyBtn.dataset.commentId = comment.id;
        }
        
        // 삭제 버튼 표시/숨김
        const deleteBtn = commentElement.querySelector('.comment-delete-btn');
        if (currentUser && currentUser.uid === comment.authorId) {
            deleteBtn.style.display = 'inline-flex';
            deleteBtn.dataset.commentId = comment.id;
        }
        
        // 신고 버튼 data-comment-id 설정
        const reportBtn = commentElement.querySelector('.report-comment-btn');
        reportBtn.dataset.commentId = comment.id;
        
        // 답글 폼 ID 설정
        const replyForm = commentElement.querySelector('.reply-form');
        replyForm.id = `reply-form-${comment.id}`;
        
        // 답글 폼 버튼들 data-comment-id 설정
        const replyFormBtns = replyForm.querySelectorAll('button');
        replyFormBtns.forEach(btn => {
            btn.dataset.commentId = comment.id;
        });
        
        // 답글 추가
        if (comment.replies.length > 0) {
            const repliesContainer = commentElement.querySelector('.replies');
            
            comment.replies.forEach(reply => {
                // 답글 템플릿 복제
                const replyElement = replyTemplate.content.cloneNode(true);
                
                // 답글 데이터 설정
                replyElement.querySelector('.comment-author').textContent = reply.authorName;
                replyElement.querySelector('.comment-date').textContent = formatDate(reply.createdAt);
                replyElement.querySelector('.comment-content').textContent = reply.content;
                
                // 답글 버튼 data-comment-id 설정
                const replyReportBtn = replyElement.querySelector('.report-comment-btn');
                replyReportBtn.dataset.commentId = reply.id;
                
                // 답글 삭제 버튼
                const replyDeleteBtn = replyElement.querySelector('.comment-delete-btn');
                if (currentUser && currentUser.uid === reply.authorId) {
                    replyDeleteBtn.style.display = 'inline-flex';
                    replyDeleteBtn.dataset.commentId = reply.id;
                }
                
                repliesContainer.appendChild(replyElement);
            });
        }
        
        // 댓글 목록에 추가
        commentList.appendChild(commentElement);
    });
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

// HTML 이스케이프 함수
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 좋아요 처리
window.handleLike = async function() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    try {
        // 하위 컬렉션에서 현재 사용자의 좋아요 확인
        const likesRef = collection(db, 'community_posts', postId, 'likes');
        const userLikeQuery = query(likesRef, where('userId', '==', currentUser.uid));
        const userLikeSnapshot = await getDocs(userLikeQuery);
        
        if (!userLikeSnapshot.empty) {
            // 이미 좋아요한 경우 - 취소
            const likeDocId = userLikeSnapshot.docs[0].id;
            await deleteDoc(doc(db, 'community_posts', postId, 'likes', likeDocId));
            await updateDoc(doc(db, 'community_posts', postId), {
                likeCount: increment(-1)
            });
            postData.likeCount = (postData.likeCount || 1) - 1;
        } else {
            // 새로운 좋아요
            await addDoc(collection(db, 'community_posts', postId, 'likes'), {
                userId: currentUser.uid,
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
            parentId: parentId,
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

// 페이지 언로드 시 리스너 정리
window.addEventListener('beforeunload', () => {
    if (commentsUnsubscribe) {
        commentsUnsubscribe();
    }
});