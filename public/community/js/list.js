import { auth, db } from '/js/firebase-config.js';
import { collection, query, orderBy, limit, startAfter, getDocs, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const POSTS_PER_PAGE = 15;
let currentPage = 1;
let lastDoc = null;
let totalPosts = 0;
let allPosts = [];

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // 로그인하지 않은 경우 글쓰기 버튼 숨기기
        const writeBtn = document.querySelector('.write-btn');
        if (writeBtn) {
            writeBtn.style.display = 'none';
        }
    }
    
    // 게시글 목록 로드
    loadPosts();
});

// 게시글 목록 로드
async function loadPosts(searchType = '', searchKeyword = '') {
    try {
        let q;
        
        if (searchKeyword) {
            // 검색 기능은 클라이언트 사이드에서 처리
            q = query(
                collection(db, 'community_posts'),
                orderBy('createdAt', 'desc')
            );
        } else {
            // 일반 목록 조회
            q = query(
                collection(db, 'community_posts'),
                orderBy('createdAt', 'desc'),
                limit(POSTS_PER_PAGE)
            );
            
            if (lastDoc && currentPage > 1) {
                q = query(
                    collection(db, 'community_posts'),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDoc),
                    limit(POSTS_PER_PAGE)
                );
            }
        }
        
        const querySnapshot = await getDocs(q);
        
        if (searchKeyword) {
            // 검색 결과 필터링
            allPosts = [];
            querySnapshot.forEach((doc) => {
                const post = { id: doc.id, ...doc.data() };
                
                let matches = false;
                switch(searchType) {
                    case 'title':
                        matches = post.title.toLowerCase().includes(searchKeyword.toLowerCase());
                        break;
                    case 'content':
                        matches = post.content.toLowerCase().includes(searchKeyword.toLowerCase());
                        break;
                    case 'author':
                        matches = post.authorName.toLowerCase().includes(searchKeyword.toLowerCase());
                        break;
                    default: // 'all'
                        matches = post.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                                 post.content.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                                 post.authorName.toLowerCase().includes(searchKeyword.toLowerCase());
                }
                
                if (matches) {
                    allPosts.push(post);
                }
            });
            
            // 검색 결과 표시
            displayPosts(allPosts.slice(0, POSTS_PER_PAGE));
            displayPagination(Math.ceil(allPosts.length / POSTS_PER_PAGE));
        } else {
            // 일반 목록 표시
            const posts = [];
            querySnapshot.forEach((doc) => {
                posts.push({ id: doc.id, ...doc.data() });
            });
            
            if (querySnapshot.docs.length > 0) {
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
    
    // 오늘 작성된 글이면 시간만 표시
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 그 외에는 날짜 표시
    return date.toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
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
document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

function performSearch() {
    const searchType = document.getElementById('searchType').value;
    const searchKeyword = document.getElementById('searchInput').value.trim();
    
    if (!searchKeyword) {
        // 검색어가 없으면 전체 목록 표시
        currentPage = 1;
        lastDoc = null;
        loadPosts();
        return;
    }
    
    currentPage = 1;
    lastDoc = null;
    loadPosts(searchType, searchKeyword);
}