// 파일경로: /job/js/job-detail.js
// 파일이름: job-detail.js

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { recordClick, toggleFavorite, checkIfFavorited, watchFavoriteStatus, toggleRecommend, checkIfRecommended, watchRecommendStatus, getStatistics } from './job-interactions.js';

let jobData = null;

// URL 파라미터에서 정보 가져오기
const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get('id');
const userId = urlParams.get('userId');

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', async function() {
    if (!jobId || !userId) {
        alert('채용정보를 찾을 수 없습니다.');
        window.location.href = 'job-list.html';
        return;
    }
    
    // 먼저 채용정보를 로드
    await loadJobDetail();
    setupEventListeners();
    
    // 인증 상태 확인 후 클릭 기록
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('사용자 인증됨, 클릭 기록 시도');
            await recordClick(jobId, userId);
        } else {
            console.log('로그인하지 않은 사용자');
        }
    });
});

// 채용정보 상세 로드
async function loadJobDetail() {
    try {
        // Firestore에서 채용정보 가져오기
        const jobDoc = await getDoc(doc(db, 'users', userId, 'ad_business', jobId));
        
        if (!jobDoc.exists()) {
            alert('채용정보를 찾을 수 없습니다.');
            window.location.href = 'job-list.html';
            return;
        }
        
        jobData = {
            id: jobDoc.id,
            ...jobDoc.data()
        };
        
        console.log('채용정보 데이터:', jobData);
        
        // 화면에 표시
        displayJobDetail();
        
    } catch (error) {
        console.error('채용정보 로드 오류:', error);
        alert('채용정보를 불러오는데 실패했습니다.');
        window.location.href = 'job-list.html';
    }
}

// 채용정보 상세 표시
function displayJobDetail() {
    // 업체 이미지
    const businessImageDiv = document.getElementById('businessImage');
    if (jobData.businessImageUrl) {
        const img = document.createElement('img');
        img.src = jobData.businessImageUrl;
        img.alt = jobData.businessName;
        businessImageDiv.appendChild(img);
    } else {
        businessImageDiv.textContent = '🏢';
    }
    
    // 업체 정보 섹션 (리스트와 동일한 구조)
    // 첫 번째 줄: 담당자명, 지역
    document.getElementById('contactNameTop').textContent = jobData.contactName || '담당자';
    
    const regionText = jobData.region1 && jobData.region2 ? 
        `${jobData.region1}/${jobData.region2}` : (jobData.region1 || jobData.region2 || '지역정보없음');
    document.getElementById('regionTag').textContent = regionText;
    
    // 두 번째 줄: 업체명 - 업종
    document.getElementById('businessNameType').textContent = 
        `${jobData.businessName || '업체명'} - ${jobData.businessType || '업종'}`;
    
    // 세 번째 줄: 급여 정보
    document.getElementById('salaryTypeTop').textContent = jobData.salaryType || '시급';
    document.getElementById('salaryAmountTop').textContent = `${formatPrice(jobData.salary)}원`;
    
    // 근무시간
    const workTimeList = document.getElementById('workTimeList');
    if (jobData.workTimeList && jobData.workTimeList.length > 0) {
        jobData.workTimeList.forEach(time => {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'work-time-item';
            timeDiv.textContent = time;
            workTimeList.appendChild(timeDiv);
        });
    } else {
        workTimeList.innerHTML = '<span style="color: #999;">근무시간 정보 없음</span>';
    }
    
    // 복지
    const welfareTags = document.getElementById('welfareTags');
    if (jobData.welfare && jobData.welfare.length > 0) {
        jobData.welfare.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'welfare-tag';
            tagSpan.textContent = tag;
            welfareTags.appendChild(tagSpan);
        });
    } else {
        welfareTags.innerHTML = '<span style="color: #999;">복지 정보 없음</span>';
    }
    
    // 상세 내용
    document.getElementById('detailContent').textContent = jobData.adDetailContent || '상세 내용이 없습니다.';
    
    // 상세 이미지
    if (jobData.detailImageUrl) {
        document.getElementById('detailImageContainer').style.display = 'block';
        document.getElementById('detailImage').src = jobData.detailImageUrl;
    }
    
    // 아이콘 버튼 이벤트 추가
    addIconButtons();
    
    // 하단 연락처 버튼 설정
    setupContactButtons();
}

// 아이콘 버튼 이벤트 추가
function addIconButtons() {
    // 추천 버튼 이벤트
    const recommendBtn = document.getElementById('recommendBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    // 초기 상태 확인
    checkIfRecommended(jobId, userId).then(isRecommended => {
        updateRecommendIcon(isRecommended);
    });
    
    checkIfFavorited(jobId, userId).then(isFavorited => {
        updateFavoriteIcon(isFavorited);
    });
    
    // 추천 버튼 클릭 이벤트
    recommendBtn.addEventListener('click', async () => {
        const isRecommended = await toggleRecommend(jobId, userId);
        updateRecommendIcon(isRecommended);
    });
    
    // 찜 버튼 클릭 이벤트
    favoriteBtn.addEventListener('click', async () => {
        const isFavorited = await toggleFavorite(jobId, userId);
        updateFavoriteIcon(isFavorited);
    });
    
    // 공유 버튼 클릭 이벤트
    shareBtn.addEventListener('click', async () => {
        const shareUrl = `${window.location.origin}/job/job-detail.html?id=${jobId}&userId=${userId}`;
        
        try {
            await navigator.clipboard.writeText(shareUrl);
            
            // 복사 완료 알림
            showCopyAlert('링크가 복사되었습니다!');
        } catch (err) {
            console.error('복사 실패:', err);
            alert('링크 복사에 실패했습니다.');
        }
    });
    
    // 상태 실시간 감시
    watchRecommendStatus(jobId, userId, (isRecommended) => {
        updateRecommendIcon(isRecommended);
    });
    
    watchFavoriteStatus(jobId, userId, (isFavorited) => {
        updateFavoriteIcon(isFavorited);
    });
}

// 하단 연락처 버튼 설정
function setupContactButtons() {
    // 카카오톡 버튼
    if (jobData.social && jobData.social.kakao) {
        const kakaoBtn = document.getElementById('kakaoBtn');
        kakaoBtn.style.display = 'flex';
        
        kakaoBtn.addEventListener('click', function() {
            const kakaoValue = jobData.social.kakao;
            
            // URL인지 확인
            if (kakaoValue.startsWith('http://') || kakaoValue.startsWith('https://')) {
                window.open(kakaoValue, '_blank');
            } else {
                // 텍스트인 경우 클립보드에 복사
                navigator.clipboard.writeText(kakaoValue).then(function() {
                    showCopyAlert('카카오톡 ID가 복사되었습니다.\n카카오톡에서 친구를 찾아보세요.');
                }).catch(function(err) {
                    console.error('복사 실패:', err);
                    alert('복사에 실패했습니다.');
                });
            }
        });
    }
    
    // 텔레그램 버튼
    if (jobData.social && jobData.social.telegram) {
        const telegramBtn = document.getElementById('telegramBtn');
        telegramBtn.style.display = 'flex';
        
        telegramBtn.addEventListener('click', function() {
            const telegramValue = jobData.social.telegram;
            
            // URL인지 확인
            if (telegramValue.startsWith('http://') || telegramValue.startsWith('https://')) {
                window.open(telegramValue, '_blank');
            } else {
                // 텍스트인 경우 클립보드에 복사
                navigator.clipboard.writeText(telegramValue).then(function() {
                    showCopyAlert('텔레그램 ID가 복사되었습니다.\n텔레그램에서 친구를 찾아보세요.');
                }).catch(function(err) {
                    console.error('복사 실패:', err);
                    alert('복사에 실패했습니다.');
                });
            }
        });
    }
    
    // 전화 버튼
    const phoneBtn = document.getElementById('phoneBtn');
    phoneBtn.addEventListener('click', function() {
        if (jobData.contactPhone) {
            window.location.href = `tel:${jobData.contactPhone}`;
        } else {
            alert('연락처 정보가 없습니다.');
        }
    });
}

// 복사 알림 표시
function showCopyAlert(message) {
    // 기존 알림이 있으면 제거
    const existingAlert = document.querySelector('.copy-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // 알림 생성
    const alertDiv = document.createElement('div');
    alertDiv.className = 'copy-alert';
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        font-size: 14px;
        line-height: 1.5;
        text-align: center;
        z-index: 10000;
        white-space: pre-line;
    `;
    
    document.body.appendChild(alertDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// 추천 아이콘 상태 업데이트
function updateRecommendIcon(isRecommended) {
    const recommendBtn = document.getElementById('recommendBtn');
    
    if (isRecommended) {
        recommendBtn.classList.add('recommended');
    } else {
        recommendBtn.classList.remove('recommended');
    }
}

// 찜 아이콘 상태 업데이트
function updateFavoriteIcon(isFavorited) {
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    if (isFavorited) {
        favoriteBtn.classList.add('favorited');
    } else {
        favoriteBtn.classList.remove('favorited');
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 이벤트 리스너는 addIconButtons에서 처리
}

// 가격 포맷팅
function formatPrice(price) {
    if (!price) return '0';
    return parseInt(price).toLocaleString();
}