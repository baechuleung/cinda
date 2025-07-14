// 파일 경로: /public/community/js/view.js

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
        
        // HTML 내용 표시 (Quill 에디터로 작성된 경우)
        if (postData.content.includes('<')) {
            // HTML 내용인 경우
            document.getElementById('postContent').innerHTML = postData.content;
        } else {
            // 일반 텍스트인 경우 (이전 버전 호환)
            document.getElementById('postContent').textContent = postData.content;
        }
        
        // 이미지 표시 제거 (Quill 에디터에 이미 포함됨)
        // 별도의 이미지 컨테이너는 비워둠
        const imagesContainer = document.getElementById('postImages');
        if (imagesContainer) {
            imagesContainer.innerHTML = '';
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

// 날짜 포맷팅
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 1시간 이내
    if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}분 전`;
    }
    
    // 24시간 이내
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours}시간 전`;
    }
    
    // 날짜 표시
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}.${month}.${day}`;
}

// 좋아요 표시
async function displayReactions() {
    if (!currentUser) return;
    
    try {
        // 하위 컬렉션에서 현재 사용자의 좋아요 확인
        const likesRef = collection(db, 'community_posts', postId, 'likes');
        const userLikeQuery = query(likesRef, where('userId', '==', currentUser.uid));
        const userLikeSnapshot = await getDocs(userLikeQuery);
        
        const likeBtn = document.getElementById('likeBtn');
        if (!userLikeSnapshot.empty) {
            likeBtn.classList.add('active');
        } else {
            likeBtn.classList.remove('active');
        }
        
        // 좋아요 수 업데이트
        document.getElementById('likeCount').textContent = postData.likeCount || 0;
    } catch (error) {
        console.error('좋아요 표시 오류:', error);
    }
}

// 댓글 로드 및 실시간 리스닝
function loadComments() {
    // 하위 컬렉션에서 댓글 가져오기
    const commentsRef = collection(db, 'community_posts', postId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    
    // 기존 리스너 정리
    if (commentsUnsubscribe) {
        commentsUnsubscribe();
    }
    
    // 실시간 리스너 설정
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
    
    if (comments.length === 0) {
        commentList.innerHTML = '<div class="no-comments">아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</div>';
        return;
    }
    
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
    
    // HTML 생성
    commentList.innerHTML = Object.values(commentMap).map(comment => {
        return `
            <div class="comment-wrapper">
                <div class="comment-item">
                    <div class="comment-header">
                        <div class="comment-info">
                            <span class="comment-author">${escapeHtml(comment.authorName)}</span>
                            <span class="comment-date">${formatDate(comment.createdAt)}</span>
                        </div>
                        <div class="comment-actions">
                            ${currentUser ? `<button class="reply-btn" onclick="showReplyForm('${comment.id}')">답글</button>` : ''}
                            <button class="report-comment-btn" onclick="reportComment('${comment.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path d="M2.66536 12.6667H13.332V11.3333H2.66536V12.6667ZM6.66536" fill="#666"/>
                                </svg>
                                신고
                            </button>
                            ${currentUser && currentUser.uid === comment.authorId ? 
                                `<button class="comment-delete-btn" onclick="deleteComment('${comment.id}')">삭제</button>` : ''}
                        </div>
                    </div>
                    <div class="comment-content">${escapeHtml(comment.content)}</div>
                </div>
                
                <!-- 답글 폼 -->
                <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                    <textarea class="reply-input" placeholder="답글을 입력하세요"></textarea>
                    <div class="reply-actions">
                        <button class="reply-cancel-btn" onclick="hideReplyForm('${comment.id}')">취소</button>
                        <button class="reply-submit-btn" onclick="submitReply('${comment.id}')">등록</button>
                    </div>
                </div>
                
                <!-- 답글 목록 -->
                ${comment.replies.length > 0 ? `
                    <div class="replies">
                        ${comment.replies.map(reply => `
                            <div class="comment-item reply-comment">
                                <div class="comment-header">
                                    <div class="comment-info">
                                        <svg class="reply-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M13.3 20.275C13.1 20.075 13 19.8417 13 19.575C13 19.3083 13.1 19.075 13.3 18.875L16.175 16H7C6.45 16 5.97917 15.8042 5.5875 15.4125C5.19583 15.0208 5 14.55 5 14V5C5 4.71667 5.09583 4.47917 5.2875 4.2875C5.47917 4.09583 5.71667 4 6 4C6.28333 4 6.52083 4.09583 6.7125 4.2875C6.90417 4.47917 7 4.71667 7 5V14H16.175L13.275 11.1C13.075 10.9 12.9792 10.6667 12.9875 10.4C12.9958 10.1333 13.0917 9.9 13.275 9.7C13.475 9.5 13.7083 9.39583 13.975 9.3875C14.2417 9.37917 14.475 9.475 14.675 9.675L19.3 14.3C19.4 14.4 19.4708 14.5083 19.5125 14.625C19.5542 14.7417 19.575 14.8667 19.575 15C19.575 15.1333 19.5542 15.2583 19.5125 15.375C19.4708 15.4917 19.4 15.6 19.3 15.7L14.725 20.275C14.525 20.475 14.2875 20.575 14.0125 20.575C13.7375 20.575 13.5 20.475 13.3 20.275Z" fill="#FF6666"/>
                                        </svg>
                                        <span class="comment-author">${escapeHtml(reply.authorName)}</span>
                                        <span class="comment-date">${formatDate(reply.createdAt)}</span>
                                    </div>
                                    <div class="comment-actions">
                                        <button class="report-comment-btn" onclick="reportComment('${reply.id}')">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16" fill="none">
                                                <path d="M2.66536 12.6667H13.332V11.3333H2.66536V12.6667ZM6.66536" fill="#666"/>
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