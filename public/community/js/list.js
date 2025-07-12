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
        // 로그인하지 않은 경우
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = '/auth/login.html';
        return;
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
    
    // 베스트 글 로드
    await loadBestPosts();
    
    // 게시글 목록 로드
    loadPosts();
});

// 베스트 글 로드
async function loadBestPosts() {
    try {
        const q = query(
            collection(db, 'community_posts'),
            orderBy('views', 'desc'),
            limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        bestPosts = [];
        
        querySnapshot.forEach((doc) => {
            bestPosts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayBestPosts();
    } catch (error) {
        console.error('베스트 글 로드 오류:', error);
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
        <div class="best-post-card">
            <div class="best-rank">${index + 1}</div>
            <div class="best-content">
                <a href="view.html?id=${post.id}" class="best-post-title">
                    ${escapeHtml(post.title)}
                </a>
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
        let q;
        
        if (currentPage === 1 || !lastDoc) {
            // 첫 페이지
            q = query(
                collection(db, 'community_posts'),
                orderBy('createdAt', 'desc'),
                limit(POSTS_PER_PAGE)
            );
        } else {
            // 다음 페이지
            q = query(
                collection(db, 'community_posts'),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(POSTS_PER_PAGE)
            );
        }
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty && currentPage > 1) {
            currentPage--;
            return;
        }
        
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        allPosts = posts;
        
        if (posts.length > 0) {
            lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        }
        
        displayPosts(posts);
        
        // 전체 게시글 수 계산 (첫 페이지일 때만)
        if (currentPage === 1) {
            const countQuery = query(collection(db, 'community_posts'));
            const countSnapshot = await getDocs(countQuery);
            totalPosts = countSnapshot.size;
            displayPagination(Math.ceil(totalPosts / POSTS_PER_PAGE));
        }
        
    } catch (error) {
        console.error('게시글 로드 오류:', error);
    }
}

// 게시글 목록 표시
function displayPosts(posts) {
    const postList = document.getElementById('postList');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (posts.length === 0) {
        postList.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    
    postList.innerHTML = posts.map((post, index) => {
        const postNumber = totalPosts - ((currentPage - 1) * POSTS_PER_PAGE) - index;
        const commentCount = post.commentCount || 0;
        
        return `
            <tr>
                <td>${postNumber}</td>
                <td>
                    <a href="view.html?id=${post.id}" class="post-title">
                        ${escapeHtml(post.title)}
                        ${commentCount > 0 ? `<span class="comment-count">[${commentCount}]</span>` : ''}
                    </a>
                </td>
                <td>${escapeHtml(post.authorName)}</td>
                <td>${formatDate(post.createdAt)}</td>
                <td>${post.views || 0}</td>
            </tr>
        `;
    }).join('');
}

// 페이지네이션 표시
function displayPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
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
    if (page === 1) {
        lastDoc = null;
    }
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