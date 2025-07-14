// 파일 경로: /public/community/js/list.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const POSTS_PER_PAGE = 15;
let currentPage = 1;
let allPosts = [];
let totalPosts = 0;
let isLoading = false;

// 페이지 로드 시 즉시 실행
document.addEventListener('DOMContentLoaded', () => {
    // 로딩 표시
    showLoading();
    
    // 게시글 먼저 로드 (인증 체크 전)
    loadInitialData();
});

// 초기 데이터 로드
async function loadInitialData() {
    try {
        // 병렬로 모든 데이터 로드
        const [postsData] = await Promise.all([
            loadAllPosts()
        ]);
        
        // 데이터 표시
        displayInitialPosts();
        
    } catch (error) {
        console.error('초기 데이터 로드 오류:', error);
        showError();
    } finally {
        hideLoading();
    }
}

// 모든 게시글 한 번에 로드
async function loadAllPosts() {
    const q = query(
        collection(db, 'community_posts'),
        orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const posts = [];
    
    querySnapshot.forEach((doc) => {
        posts.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    allPosts = posts;
    return posts;
}

// 초기 게시글 표시
function displayInitialPosts() {
    // 공지사항과 일반 게시글 분리
    const noticePosts = allPosts.filter(post => post.isNotice);
    const normalPosts = allPosts.filter(post => !post.isNotice);
    
    // 베스트 글 표시 (조회수 상위 5개)
    const bestPosts = [...normalPosts]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5);
    displayBestPosts(bestPosts);
    
    // 페이지네이션을 위한 총 게시글 수
    totalPosts = normalPosts.length;
    
    // 현재 페이지 게시글
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const paginatedPosts = normalPosts.slice(startIndex, endIndex);
    
    // 공지사항 + 페이지 게시글 표시
    displayPosts([...noticePosts, ...paginatedPosts]);
    
    // 페이지네이션 표시
    displayPagination(Math.ceil(totalPosts / POSTS_PER_PAGE));
}

// 인증 상태 확인 (별도 처리)
onAuthStateChanged(auth, async (user) => {
    const writeBtn = document.querySelector('.write-btn');
    
    if (!user) {
        if (writeBtn) writeBtn.style.display = 'none';
        return;
    }
    
    // 권한 확인 (비동기로 처리)
    checkWritePermission(user).then(hasPermission => {
        if (writeBtn) {
            writeBtn.style.display = hasPermission ? 'inline-block' : 'none';
        }
    });
});

// 글쓰기 권한 확인 (최적화)
async function checkWritePermission(user) {
    try {
        // admin 확인
        const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
        if (adminDoc.exists()) return true;
        
        // individual user 확인
        const individualDoc = await getDoc(doc(db, 'individual_users', user.uid));
        if (individualDoc.exists() && individualDoc.data().gender === 'female') {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('권한 확인 오류:', error);
        return false;
    }
}

// 로딩 표시
function showLoading() {
    const postList = document.getElementById('postList');
    postList.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 10px; color: #666;">게시글을 불러오는 중...</p>
            </td>
        </tr>
    `;
}

// 로딩 숨기기
function hideLoading() {
    // 로딩 완료
}

// 에러 표시
function showError() {
    const postList = document.getElementById('postList');
    postList.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                게시글을 불러오는 중 오류가 발생했습니다.
            </td>
        </tr>
    `;
}

// 게시글 표시
function displayPosts(posts) {
    const postList = document.getElementById('postList');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (posts.length === 0) {
        postList.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    
    // 공지사항과 일반 게시글 구분
    const noticePosts = posts.filter(post => post.isNotice);
    const normalPosts = posts.filter(post => !post.isNotice);
    
    let normalPostIndex = 0;
    
    postList.innerHTML = posts.map(post => {
        let postNumber;
        if (post.isNotice) {
            postNumber = '<span class="notice-badge">공지</span>';
        } else {
            postNumber = totalPosts - ((currentPage - 1) * POSTS_PER_PAGE) - normalPostIndex;
            normalPostIndex++;
        }
        
        const commentCount = post.commentCount || 0;
        const likeCount = post.likeCount || 0;
        const viewCount = post.views || 0;
        const imageCount = post.images?.length || 0;
        const hasQuillImages = post.content?.includes('<img') || false;
        const totalImageCount = imageCount || (hasQuillImages ? '+' : 0);
        
        return `
            <tr class="${post.isNotice ? 'notice-row' : ''}" onclick="location.href='view.html?id=${post.id}'" style="cursor: pointer;">
                <td class="col-no">${postNumber}</td>
                <td class="col-title">
                    <span class="post-title">
                        ${escapeHtml(post.title)}
                        ${totalImageCount ? `
                            <span class="image-indicator">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2.00033 13.9997C1.63366 13.9997 1.31977 13.8691 1.05866 13.608C0.797548 13.3469 0.666992 13.033 0.666992 12.6663V4.66634C0.666992 4.47745 0.730881 4.31912 0.858659 4.19134C0.986437 4.06356 1.14477 3.99967 1.33366 3.99967C1.52255 3.99967 1.68088 4.06356 1.80866 4.19134C1.93644 4.31912 2.00033 4.47745 2.00033 4.66634V12.6663H12.667C12.8559 12.6663 13.0142 12.7302 13.142 12.858C13.2698 12.9858 13.3337 13.1441 13.3337 13.333C13.3337 13.5219 13.2698 13.6802 13.142 13.808C13.0142 13.9358 12.8559 13.9997 12.667 13.9997H2.00033ZM4.66699 11.333C4.30033 11.333 3.98644 11.2025 3.72533 10.9413C3.46421 10.6802 3.33366 10.3663 3.33366 9.99967V2.66634C3.33366 2.29967 3.46421 1.98579 3.72533 1.72467C3.98644 1.46356 4.30033 1.33301 4.66699 1.33301H7.45033C7.6281 1.33301 7.79755 1.36634 7.95866 1.43301C8.11977 1.49967 8.26144 1.59412 8.38366 1.71634L9.33366 2.66634H14.0003C14.367 2.66634 14.6809 2.7969 14.942 3.05801C15.2031 3.31912 15.3337 3.63301 15.3337 3.99967V9.99967C15.3337 10.3663 15.2031 10.6802 14.942 10.9413C14.6809 11.2025 14.367 11.333 14.0003 11.333H4.66699ZM4.66699 9.99967H14.0003V3.99967H8.78366L7.45033 2.66634H4.66699V9.99967ZM8.83366 7.66634L8.06699 6.66634C8.00033 6.57745 7.91144 6.53301 7.80033 6.53301C7.68921 6.53301 7.60033 6.57745 7.53366 6.66634L6.41699 8.13301C6.3281 8.24412 6.31421 8.36079 6.37533 8.48301C6.43644 8.60523 6.53921 8.66634 6.68366 8.66634H11.9837C12.1281 8.66634 12.2309 8.60523 12.292 8.48301C12.3531 8.36079 12.3392 8.24412 12.2503 8.13301L10.6337 6.01634C10.567 5.92745 10.4781 5.88301 10.367 5.88301C10.2559 5.88301 10.167 5.92745 10.1003 6.01634L8.83366 7.66634Z" fill="#3182F6"/>
                                </svg>
                                <span class="image-count">${totalImageCount}</span>
                            </span>
                        ` : ''}
                        ${commentCount > 0 ? `<span class="comment-count">[${commentCount}]</span>` : ''}
                    </span>
                    
                    <!-- 모바일용 정보 (숨김) -->
                    <div class="mobile-info">
                        <span class="mobile-author">${escapeHtml(post.authorName)}</span>
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            ${viewCount}
                        </span>
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            ${likeCount}
                        </span>
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            ${commentCount}
                        </span>
                    </div>
                </td>
                <td class="col-author desktop-only">${escapeHtml(post.authorName)}</td>
                <td class="col-date desktop-only">${formatDate(post.createdAt)}</td>
                <td class="col-views desktop-only">${viewCount}</td>
                <td class="col-likes desktop-only">${likeCount}</td>
            </tr>
        `;
    }).join('');
}

// 베스트 글 표시
function displayBestPosts(bestPosts) {
    // 베스트 글 섹션이 없으면 생성
    if (!document.getElementById('bestPostsSection')) {
        const boardList = document.querySelector('.board-list');
        const bestHTML = `
            <div class="best-posts-section" id="bestPostsSection">
                <h3 class="best-title">베스트 글</h3>
                <div class="best-posts-grid" id="bestPostsGrid"></div>
            </div>
        `;
        boardList.insertAdjacentHTML('beforebegin', bestHTML);
    }
    
    const bestGrid = document.getElementById('bestPostsGrid');
    bestGrid.innerHTML = bestPosts.map((post, index) => `
        <div class="best-post-card" onclick="location.href='view.html?id=${post.id}'">
            <div class="best-rank">${index + 1}</div>
            <div class="best-content">
                <span class="best-post-title">${escapeHtml(post.title)}</span>
                <div class="best-post-info">
                    <span class="best-author">${escapeHtml(post.authorName)}</span>
                    <span class="best-views">조회 ${post.views || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 페이지네이션 표시
function displayPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalPages <= 1) return;
    
    let html = '';
    
    // 이전 버튼
    if (currentPage > 1) {
        html += `<a href="#" class="page-btn" data-page="${currentPage - 1}">이전</a>`;
    }
    
    // 페이지 번호
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<a href="#" class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</a>`;
    }
    
    // 다음 버튼
    if (currentPage < totalPages) {
        html += `<a href="#" class="page-btn" data-page="${currentPage + 1}">다음</a>`;
    }
    
    pagination.innerHTML = html;
    
    // 이벤트 리스너
    pagination.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page !== currentPage) {
                currentPage = page;
                displayInitialPosts();
                window.scrollTo(0, 0);
            }
        });
    });
}

// 날짜 포맷팅
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 24시간 이내
    if (diff < 24 * 60 * 60 * 1000) {
        if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes}분 전`;
        }
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours}시간 전`;
    }
    
    // 날짜 표시
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 올해면 년도 생략
    if (year === now.getFullYear()) {
        return `${month}.${day}`;
    }
    
    return `${year}.${month}.${day}`;
}

// HTML 이스케이프
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 검색 기능
document.getElementById('searchBtn')?.addEventListener('click', searchPosts);
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPosts();
});

async function searchPosts() {
    const searchType = document.getElementById('searchType').value;
    const searchKeyword = document.getElementById('searchInput').value.trim();
    
    if (!searchKeyword) {
        currentPage = 1;
        displayInitialPosts();
        return;
    }
    
    showLoading();
    
    try {
        let filteredPosts = [];
        
        if (searchType === 'title') {
            filteredPosts = allPosts.filter(post => 
                post.title.toLowerCase().includes(searchKeyword.toLowerCase())
            );
        } else if (searchType === 'author') {
            filteredPosts = allPosts.filter(post => 
                post.authorName === searchKeyword
            );
        } else if (searchType === 'titleContent') {
            filteredPosts = allPosts.filter(post => 
                post.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                (post.contentText || post.content || '').toLowerCase().includes(searchKeyword.toLowerCase())
            );
        }
        
        // 검색 결과 표시
        const normalPosts = filteredPosts.filter(post => !post.isNotice);
        totalPosts = normalPosts.length;
        currentPage = 1;
        
        const paginatedPosts = normalPosts.slice(0, POSTS_PER_PAGE);
        displayPosts(paginatedPosts);
        displayPagination(Math.ceil(totalPosts / POSTS_PER_PAGE));
        
    } catch (error) {
        console.error('검색 오류:', error);
        showError();
    } finally {
        hideLoading();
    }
}