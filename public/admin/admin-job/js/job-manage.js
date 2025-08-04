// 파일 경로: /admin/admin-job/js/job-manage.js
// 파일 이름: job-manage.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, orderBy, collectionGroup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allJobs = [];
let filteredJobs = [];
let currentPage = 1;
const itemsPerPage = 10;

// 헤더 로드
fetch('/admin/header.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('header-container').innerHTML = data;
        
        // 헤더 스크립트 로드
        const script = document.createElement('script');
        script.src = '/admin/js/header.js';
        script.type = 'module';
        document.body.appendChild(script);
    });

// 인증 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/admin/login.html';
        return;
    }
    
    // 관리자 권한 확인
    const q = query(collection(db, 'admin_users'), where('uid', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        alert('관리자 권한이 없습니다.');
        await auth.signOut();
        window.location.href = '/admin/login.html';
        return;
    }
    
    // 공고 데이터 로드
    loadJobs();
});

// 공고 데이터 로드
async function loadJobs() {
    try {
        // collectionGroup을 사용하여 모든 users의 ad_business 서브컬렉션 가져오기
        const jobsQuery = query(collectionGroup(db, 'ad_business'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(jobsQuery);
        
        allJobs = [];
        
        for (const docSnap of querySnapshot.docs) {
            const jobData = docSnap.data();
            const userId = docSnap.ref.parent.parent.id;
            
            // 사용자 정보 가져오기
            const userDocRef = doc(db, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);
            const userData = userDocSnap.exists() ? userDocSnap.data() : {};
            
            allJobs.push({
                id: docSnap.id,
                userId: userId,
                ...jobData,
                userName: userData.name || '알 수 없음',
                userNickname: userData.nickname || '-',
                userEmail: userData.email || ''
            });
        }
        
        filteredJobs = [...allJobs];
        updateStats();
        displayJobs();
        
    } catch (error) {
        console.error('공고 로드 오류:', error);
        alert('공고 데이터를 불러오는데 실패했습니다.');
    }
}

// 통계 업데이트
function updateStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let activeCount = 0;
    let expiredCount = 0;
    let todayCount = 0;
    
    allJobs.forEach(job => {
        // 상태별 카운트
        const endDate = job.endDate ? new Date(job.endDate) : null;
        const isExpired = endDate && endDate < now;
        
        if (job.status === 'expired' || isExpired) {
            expiredCount++;
        } else if (job.status === 'completed') {
            activeCount++;
        }
        
        // 오늘 등록된 공고
        const createdAt = job.createdAt?.toDate ? job.createdAt.toDate() : new Date(job.createdAt);
        if (createdAt >= today) {
            todayCount++;
        }
    });
    
    document.getElementById('totalJobs').textContent = allJobs.length;
    document.getElementById('activeJobs').textContent = activeCount;
    document.getElementById('expiredJobs').textContent = expiredCount;
    document.getElementById('todayJobs').textContent = todayCount;
}

// 공고 목록 표시
function displayJobs() {
    const tbody = document.getElementById('jobsTableBody');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageJobs = filteredJobs.slice(startIndex, endIndex);
    
    pageJobs.forEach((job, index) => {
        const row = createJobRow(job, startIndex + index + 1);
        tbody.appendChild(row);
    });
    
    // 페이지네이션 업데이트
    updatePagination();
}

// 공고 행 생성
function createJobRow(job, number) {
    const row = document.createElement('tr');
    
    const createdAt = job.createdAt?.toDate ? job.createdAt.toDate() : new Date(job.createdAt);
    const endDate = job.endDate ? new Date(job.endDate) : null;
    const now = new Date();
    const isExpired = endDate && endDate < now;
    
    // 상태 결정
    let status = job.status || 'pending';
    let statusText = '심사중';
    let statusClass = 'status-pending';
    
    // 마감일이 지났으면 상태를 expired로 강제 설정
    if (isExpired && status !== 'expired') {
        status = 'expired';
    }
    
    if (status === 'completed') {
        statusText = '광고중';
        statusClass = 'status-active';
    } else if (status === 'pending') {
        statusText = '심사중';
        statusClass = 'status-pending';
    } else if (status === 'expired') {
        statusText = '만료';
        statusClass = 'status-expired';
    }
    
    row.innerHTML = `
        <td>${number}</td>
        <td>${job.businessName || '업소명 없음'}</td>
        <td>${job.userName || '-'}</td>
        <td>${job.userNickname || '-'}</td>
        <td>${job.userEmail}</td>
        <td>${formatDate(createdAt)}</td>
        <td>${endDate ? formatDate(endDate) : '-'}</td>
        <td>${job.duration || 0}개월</td>
        <td>
            <span class="${job.imageCreationRequested ? 'badge-yes' : 'badge-no'}">
                ${job.imageCreationRequested ? 'O' : 'X'}
            </span>
        </td>
        <td>${(job.weighted_score || 0).toFixed(1)}</td>
        <td>
            <select class="status-select" onchange="updateJobStatus('${job.id}', '${job.userId}', this.value)">
                <option value="pending" ${status === 'pending' ? 'selected' : ''}>심사중</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>광고중</option>
                <option value="expired" ${status === 'expired' ? 'selected' : ''}>만료</option>
            </select>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-primary btn-small" onclick="viewJobDetail('${job.id}', '${job.userId}')">상세</button>
                <button class="btn btn-danger btn-small" onclick="deleteJob('${job.id}', '${job.userId}')">삭제</button>
            </div>
        </td>
    `;
    
    return row;
}

// 날짜 포맷
function formatDate(date) {
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 공고 상세보기
window.viewJobDetail = function(jobId, userId) {
    const layer = document.getElementById('jobDetailLayer');
    const iframe = document.getElementById('detailFrame');
    
    // iframe에 상세 페이지 로드
    iframe.src = `/admin/admin-job/job-detail.html?jobId=${jobId}&userId=${userId}`;
    
    // 레이어 팝업 표시
    layer.style.display = 'block';
};

// 상태 업데이트
window.updateJobStatus = async function(jobId, userId, newStatus) {
    // 상태를 '광고중'으로 변경하려는 경우 마감일 입력 받기
    if (newStatus === 'completed') {
        const modal = document.getElementById('endDateModal');
        const endDateInput = document.getElementById('endDateInput');
        
        // 오늘 날짜를 최소값으로 설정
        const today = new Date().toISOString().split('T')[0];
        endDateInput.min = today;
        endDateInput.value = '';
        
        // 모달 표시
        modal.style.display = 'block';
        
        // 확인 버튼 이벤트 (기존 이벤트 제거 후 새로 추가)
        const confirmBtn = document.getElementById('confirmEndDate');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', async () => {
            const selectedDate = endDateInput.value;
            if (!selectedDate) {
                alert('마감일을 선택해주세요.');
                return;
            }
            
            modal.style.display = 'none';
            await performStatusUpdate(jobId, userId, newStatus, selectedDate);
        });
        
        // 취소 버튼 이벤트
        document.getElementById('cancelEndDate').onclick = () => {
            modal.style.display = 'none';
            // 셀렉트 박스를 원래 상태로 되돌리기
            location.reload();
        };
        
    } else {
        // 다른 상태로 변경하는 경우
        await performStatusUpdate(jobId, userId, newStatus);
    }
};

// 실제 상태 업데이트 수행
async function performStatusUpdate(jobId, userId, newStatus, endDate = null) {
    try {
        console.log('상태 업데이트 시도:', { jobId, userId, newStatus, endDate });
        
        const docRef = doc(db, 'users', userId, 'ad_business', jobId);
        
        // 업데이트할 데이터
        const updateData = {
            status: newStatus,
            updatedAt: new Date()
        };
        
        // 마감일이 있으면 추가
        if (endDate) {
            updateData.endDate = endDate;
        }
        
        // 상태 업데이트
        await updateDoc(docRef, updateData);
        
        // 로컬 데이터 업데이트
        const job = allJobs.find(j => j.id === jobId && j.userId === userId);
        if (job) {
            job.status = newStatus;
            if (endDate) {
                job.endDate = endDate;
            }
        }
        
        alert('상태가 변경되었습니다.');
        
        // 페이지 새로고침
        location.reload();
        
    } catch (error) {
        console.error('상태 업데이트 오류:', error);
        
        if (error.code === 'permission-denied') {
            alert('권한이 없습니다. Firestore 규칙을 확인해주세요.');
        } else {
            alert('상태 변경에 실패했습니다: ' + error.message);
        }
        
        // 오류 시 페이지 새로고침
        location.reload();
    }
}

// 공고 삭제
window.deleteJob = async function(jobId, userId) {
    if (!confirm('정말로 이 공고를 삭제하시겠습니까?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', userId, 'ad_business', jobId));
        alert('공고가 삭제되었습니다.');
        loadJobs();
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('공고 삭제에 실패했습니다.');
    }
};

// 페이지네이션 업데이트
function updatePagination() {
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '이전';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayJobs();
        }
    };
    pagination.appendChild(prevBtn);
    
    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
            currentPage = i;
            displayJobs();
        };
        pagination.appendChild(pageBtn);
    }
    
    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음';
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayJobs();
        }
    };
    pagination.appendChild(nextBtn);
}

// 검색 기능
document.getElementById('searchBtn').addEventListener('click', searchJobs);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchJobs();
});

function searchJobs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    // 필터링
    filteredJobs = allJobs.filter(job => {
        // 검색어 필터
        const matchSearch = !searchTerm || 
            job.businessName?.toLowerCase().includes(searchTerm) ||
            job.userName?.toLowerCase().includes(searchTerm) ||
            job.userNickname?.toLowerCase().includes(searchTerm) ||
            job.description?.toLowerCase().includes(searchTerm);
        
        // 상태 필터
        const endDate = job.endDate ? new Date(job.endDate) : null;
        const isExpired = endDate && endDate < now;
        
        const matchStatus = !statusFilter ||
            (statusFilter === 'pending' && job.status === 'pending') ||
            (statusFilter === 'completed' && job.status === 'completed' && !isExpired) ||
            (statusFilter === 'expired' && (job.status === 'expired' || isExpired));
        
        return matchSearch && matchStatus;
    });
    
    // 정렬
    filteredJobs.sort((a, b) => {
        switch (sortBy) {
            case 'createdAt':
                return (b.createdAt?.toDate?.() || new Date(b.createdAt)) - 
                       (a.createdAt?.toDate?.() || new Date(a.createdAt));
            case 'endDate':
                const aEnd = a.endDate ? new Date(a.endDate) : new Date(9999, 11, 31);
                const bEnd = b.endDate ? new Date(b.endDate) : new Date(9999, 11, 31);
                return aEnd - bEnd;
            case 'views':
                return (b.statistics?.views || 0) - (a.statistics?.views || 0);
            default:
                return 0;
        }
    });
    
    currentPage = 1;
    displayJobs();
}

// 필터 변경 이벤트
document.getElementById('statusFilter').addEventListener('change', searchJobs);
document.getElementById('sortBy').addEventListener('change', searchJobs);

// 레이어 팝업 닫기
document.querySelector('.layer-close').addEventListener('click', () => {
    document.getElementById('jobDetailLayer').style.display = 'none';
    document.getElementById('detailFrame').src = '';
});

// 레이어 팝업 외부 클릭 시 닫기
document.getElementById('jobDetailLayer').addEventListener('click', (e) => {
    if (e.target.id === 'jobDetailLayer') {
        document.getElementById('jobDetailLayer').style.display = 'none';
        document.getElementById('detailFrame').src = '';
    }
});

// 마감일 모달 닫기
document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('endDateModal').style.display = 'none';
});

// 마감일 모달 외부 클릭 시 닫기
window.addEventListener('click', (e) => {
    const modal = document.getElementById('endDateModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});