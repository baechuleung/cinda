// 파일 경로: /community/list.js
// 파일 이름: list.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, orderBy, limit, startAfter, getDocs, where, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const POSTS_PER_PAGE = 15;
let currentPage = 1;
let lastDoc = null;
let totalPosts = 0;
let allPosts = [];
let bestPosts = []; // 베스트 글 저장

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    const writeBtn = document.querySelector('.write-btn');
    
    if (!user) {
        // 로그인하지 않은 경우에도 리스트는 볼 수 있음
        if (writeBtn) {
            writeBtn.style.display = 'none';
        }
    } else {
        // 글쓰기 권한 확인
        let hasWritePermission = false;
        
        // admin_users 확인
        try {
            const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
            if (adminDoc.exists()) {
                hasWritePermission = true;
            }
        } catch (error) {
            // 오류 무시
        }
        
        // admin이 아닌 경우 individual_users 확인
        if (!hasWritePermission) {
            try {
                const individualDoc = await getDoc(doc(db, 'individual_users', user.uid));
                if (individualDoc.exists()) {
                    const userData = individualDoc.data();
                    if (userData.gender === 'female') {
                        hasWritePermission = true;
                    }
                }
            } catch (error) {
                // 오류 무시
            }
        }
        
        // 권한에 따라 글쓰기 버튼 표시/숨김
        if (writeBtn) {
            writeBtn.style.display = hasWritePermission ? 'inline-block' : 'none';
        }
    }
    
    // 공지사항 로드
    await loadNoticePosts();
    
    // 베스트 글 로드
    await loadBestPosts();
    
    // 게시글 목록 로드
    loadPosts();
});

// 공지사항 로드 함수 추가
async function loadNoticePosts() {
    try {
        // 복합 인덱스를 피하기 위해 모든 게시글을 가져온 후 필터링
        const q = query(
            collection(db, 'community_posts')
        );
        
        const querySnapshot = await getDocs(q);
        const notices = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.isNotice === true) {
                notices.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        // 날짜순 정렬
        notices.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
        });
        
        // 공지사항은 loadPosts에서 처리하므로 여기서는 별도 처리 없음
        console.log(`공지사항 ${notices.length}개 로드됨`);
    } catch (error) {
        console.error('공지사항 로드 오류:', error);
    }
}

// 베스트 글 로드
async function loadBestPosts() {
    try {
        // 모든 게시글을 가져와서 코드에서 필터링
        const q = query(
            collection(db, 'community_posts')
        );
        
        const querySnapshot = await getDocs(q);
        const allPostsForBest = [];
        
        querySnapshot.forEach((doc) => {
            allPostsForBest.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 공지사항 제외하고 조회수 순으로 정렬
        bestPosts = allPostsForBest
            .filter(post => !post.isNotice)
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 5);
        
        displayBestPosts();
    } catch (error) {
        console.error('베스트 글 로드 오류:', error);
        bestPosts = [];
        displayBestPosts();
    }
}

// 베스트 글 표시
function displayBestPosts() {
    const bestSection = document.getElementById('bestPostsSection');
    if (!bestSection) {
        // 베스트 글 섹션 생성
        const boardList = document.querySelector('.board-list');
        const bestHTML = `
            <div class="best-posts-section" id="bestPostsSection">
                <h3 class="best-title">베스트 글</h3>
                <div class="best-posts-grid" id="bestPostsGrid">
                    <!-- 베스트 글이 여기에 표시됩니다 -->
                </div>
            </div>
        `;
        boardList.insertAdjacentHTML('beforebegin', bestHTML);
    }
    
    const bestGrid = document.getElementById('bestPostsGrid');
    bestGrid.innerHTML = bestPosts.map((post, index) => `
        <div class="best-post-card" onclick="location.href='view.html?id=${post.id}'">
            <div class="best-rank">${index + 1}</div>
            <div class="best-content">
                <span class="best-post-title">
                    ${escapeHtml(post.title)}
                </span>
                <div class="best-post-info">
                    <span class="best-author">${escapeHtml(post.authorName)}</span>
                    <span class="best-views">조회 ${post.views || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 게시글 목록 로드
async function loadPosts() {
    try {
        // 전체 게시글을 가져와서 코드에서 정렬
        const q = query(
            collection(db, 'community_posts')
        );
        
        const querySnapshot = await getDocs(q);
        
        const allPostsData = [];
        querySnapshot.forEach((doc) => {
            allPostsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 공지사항과 일반 게시글 분리
        const noticePosts = allPostsData.filter(post => post.isNotice);
        const normalPosts = allPostsData.filter(post => !post.isNotice);
        
        // 각각 날짜순 정렬
        noticePosts.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
        });
        
        normalPosts.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
        });
        
        // 페이지네이션은 일반 게시글에만 적용
        totalPosts = normalPosts.length;
        const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
        const endIndex = startIndex + POSTS_PER_PAGE;
        const paginatedNormalPosts = normalPosts.slice(startIndex, endIndex);
        
        // 공지사항은 항상 상단에 표시, 일반 게시글은 페이지네이션 적용
        const posts = [...noticePosts, ...paginatedNormalPosts];
        
        allPosts = posts;
        
        displayPosts(posts);
        
        // 전체 페이지 수 계산하여 페이지네이션 표시
        displayPagination(Math.ceil(totalPosts / POSTS_PER_PAGE));
        
    } catch (error) {
        console.error('게시글 로드 오류:', error);
        allPosts = [];
        displayPosts([]);
    }
}

// 게시글 목록 표시 (테이블 형태)
function displayPosts(posts) {
    const postList = document.getElementById('postList');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (posts.length === 0) {
        postList.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    
    // 공지사항 분리
    const noticePosts = posts.filter(post => post.isNotice);
    const normalPosts = posts.filter(post => !post.isNotice);
    
    // 공지사항 먼저, 그 다음 일반 게시글
    const sortedPosts = [...noticePosts, ...normalPosts];
    
    // 번호 계산을 위한 인덱스
    let normalPostIndex = 0;
    
    postList.innerHTML = sortedPosts.map((post) => {
        let postNumber;
        if (post.isNotice) {
            postNumber = '<span class="notice-badge">공지</span>';
        } else {
            postNumber = totalPosts - ((currentPage - 1) * POSTS_PER_PAGE) - normalPostIndex;
            normalPostIndex++;
        }
        
        const commentCount = post.commentCount || 0;
        const likeCount = post.likeCount || 0;
        const postDate = formatDate(post.createdAt);
        
        return `
            <tr class="${post.isNotice ? 'notice-row' : ''}" onclick="location.href='view.html?id=${post.id}'" style="cursor: pointer;">
                <td class="col-no">${postNumber}</td>
                <td class="col-title">
                    <span class="post-title">
                        ${escapeHtml(post.title)}
                        ${commentCount > 0 ? `<span class="comment-count">[${commentCount}]</span>` : ''}
                    </span>
                    <!-- 모바일용 정보 -->
                    <div class="mobile-info">
                        <span class="mobile-author">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            ${escapeHtml(post.authorName)}
                        </span>
                        <span class="mobile-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${postDate}
                        </span>
                        <span class="mobile-views">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            ${post.views || 0}
                        </span>
                        <span class="mobile-likes">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            ${likeCount}
                        </span>
                    </div>
                </td>
                <td class="col-author desktop-only">${escapeHtml(post.authorName)}</td>
                <td class="col-date desktop-only">${postDate}</td>
                <td class="col-views desktop-only">${post.views || 0}</td>
                <td class="col-likes desktop-only">${likeCount}</td>
            </tr>
        `;
    }).join('');
}

// 페이지네이션 표시
function displayPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    
    // 페이지가 1개여도 페이지네이션 표시
    if (totalPages === 0) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // 이전 페이지
    if (currentPage > 1) {
        html += `<a href="#" class="page-btn" onclick="goToPage(${currentPage - 1})">이전</a>`;
    }
    
    // 페이지 번호
    const startPage = Math.floor((currentPage - 1) / 10) * 10 + 1;
    const endPage = Math.min(startPage + 9, totalPages);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<a href="#" class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</a>`;
    }
    
    // 다음 페이지
    if (currentPage < totalPages) {
        html += `<a href="#" class="page-btn" onclick="goToPage(${currentPage + 1})">다음</a>`;
    }
    
    pagination.innerHTML = html;
}

// 페이지 이동
window.goToPage = function(page) {
    currentPage = page;
    loadPosts();
    window.scrollTo(0, 0);
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

// 검색 기능
document.getElementById('searchBtn').addEventListener('click', searchPosts);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchPosts();
    }
});

async function searchPosts() {
    const searchType = document.getElementById('searchType').value;
    const searchKeyword = document.getElementById('searchInput').value.trim();
    
    if (!searchKeyword) {
        currentPage = 1;
        lastDoc = null;
        loadPosts();
        return;
    }
    
    try {
        let q;
        
        if (searchType === 'title') {
            // 제목 검색 (Firestore는 부분 검색이 제한적이므로 전체 데이터를 가져와서 필터링)
            q = query(
                collection(db, 'community_posts'),
                orderBy('createdAt', 'desc')
            );
        } else if (searchType === 'author') {
            // 작성자 검색
            q = query(
                collection(db, 'community_posts'),
                where('authorName', '==', searchKeyword),
                orderBy('createdAt', 'desc')
            );
        } else {
            // 제목+내용 검색 (전체 데이터를 가져와서 필터링)
            q = query(
                collection(db, 'community_posts'),
                orderBy('createdAt', 'desc')
            );
        }
        
        const querySnapshot = await getDocs(q);
        
        let searchResults = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            if (searchType === 'title' && data.title.includes(searchKeyword)) {
                searchResults.push({ id: doc.id, ...data });
            } else if (searchType === 'author') {
                searchResults.push({ id: doc.id, ...data });
            } else if (searchType === 'titleContent' && 
                      (data.title.includes(searchKeyword) || data.content.includes(searchKeyword))) {
                searchResults.push({ id: doc.id, ...data });
            }
        });
        
        totalPosts = searchResults.length;
        displayPosts(searchResults.slice(0, POSTS_PER_PAGE));
        displayPagination(Math.ceil(totalPosts / POSTS_PER_PAGE));
        
    } catch (error) {
        console.error('검색 오류:', error);
        alert('검색 중 오류가 발생했습니다.');
    }
}