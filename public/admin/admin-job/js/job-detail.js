// 파일 경로: /admin/admin-job/js/job-detail.js
// 파일 이름: job-detail.js

import { db, storage } from '/js/firebase-config.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// URL 파라미터에서 jobId와 userId 가져오기
const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get('jobId');
const userId = urlParams.get('userId');

let currentJobData = null;
let selectedFile = null;

// 페이지 로드 시 공고 정보 가져오기
document.addEventListener('DOMContentLoaded', async () => {
    if (!jobId || !userId) {
        alert('잘못된 접근입니다.');
        window.close();
        return;
    }
    
    await loadJobDetail();
    setupImageUpload();
});

// 이미지 업로드 설정
function setupImageUpload() {
    const contentImageUpload = document.getElementById('contentImageUpload');
    
    // 상세 내용 이미지 업로드
    contentImageUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        try {
            const uploadPromises = files.map(async (file) => {
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substring(7);
                const fileName = `ad_business/${userId}/${jobId}/content/${timestamp}_${randomId}_${file.name}`;
                const storageRef = ref(storage, fileName);
                
                const snapshot = await uploadBytes(storageRef, file);
                return await getDownloadURL(snapshot.ref);
            });
            
            const newImageUrls = await Promise.all(uploadPromises);
            
            // 기존 이미지 배열에 추가
            const contentImages = currentJobData.contentImages || [];
            const updatedImages = [...contentImages, ...newImageUrls];
            
            // Firestore 업데이트
            const docRef = doc(db, 'users', userId, 'ad_business', jobId);
            await updateDoc(docRef, {
                contentImages: updatedImages,
                updatedAt: new Date()
            });
            
            alert('이미지가 추가되었습니다.');
            location.reload();
            
        } catch (error) {
            console.error('이미지 업로드 오류:', error);
            alert('이미지 업로드에 실패했습니다.');
        }
        
        // 입력 초기화
        contentImageUpload.value = '';
    });
}

// 이미지 삭제
window.deleteContentImage = async function(imageUrl, index) {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return;
    
    try {
        // Storage에서 삭제
        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
        } catch (error) {
            console.log('Storage 삭제 실패:', error);
        }
        
        // 배열에서 제거
        const contentImages = currentJobData.contentImages || [];
        contentImages.splice(index, 1);
        
        // Firestore 업데이트
        const docRef = doc(db, 'users', userId, 'ad_business', jobId);
        await updateDoc(docRef, {
            contentImages: contentImages,
            updatedAt: new Date()
        });
        
        alert('이미지가 삭제되었습니다.');
        location.reload();
        
    } catch (error) {
        console.error('이미지 삭제 오류:', error);
        alert('이미지 삭제에 실패했습니다.');
    }
};

// 이미지 확대 보기
window.showImageModal = function(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <span class="close-modal">&times;</span>
        <img src="${imageUrl}" alt="확대 이미지">
    `;
    
    modal.onclick = function() {
        modal.remove();
    };
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
};

// 공고 상세 정보 로드
async function loadJobDetail() {
    try {
        // 공고 정보 가져오기
        const jobDocRef = doc(db, 'users', userId, 'ad_business', jobId);
        const jobDoc = await getDoc(jobDocRef);
        
        if (!jobDoc.exists()) {
            alert('공고 정보를 찾을 수 없습니다.');
            window.close();
            return;
        }
        
        currentJobData = jobDoc.data();
        
        // 사용자 정보 가져오기
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // 데이터 표시
        displayJobDetail(currentJobData, userData);
        
    } catch (error) {
        console.error('공고 정보 로드 오류:', error);
        alert('공고 정보를 불러오는데 실패했습니다.');
    }
}

// 공고 정보 표시
function displayJobDetail(jobData, userData) {
    // 기본 정보
    document.getElementById('businessName').textContent = jobData.businessName || '-';
    document.getElementById('businessType').textContent = jobData.businessType || '-';
    document.getElementById('contactInfo').textContent = 
        `${jobData.contactName || '-'} (${jobData.contactPhone || '-'})`;
    document.getElementById('region').textContent = 
        `${jobData.region1 || ''} ${jobData.region2 || ''}`.trim() || '-';
    document.getElementById('salary').textContent = 
        `${jobData.salaryType || ''} ${jobData.salary || '-'}원`.trim();
    
    // 근무시간
    const workTimeElement = document.getElementById('workTime');
    if (jobData.workTimeList && jobData.workTimeList.length > 0) {
        workTimeElement.innerHTML = jobData.workTimeList.join('<br>');
    } else {
        workTimeElement.textContent = '-';
    }
    
    // 복지
    document.getElementById('welfare').textContent = 
        jobData.welfare?.join(', ') || '-';
    
    // SNS 정보
    document.getElementById('kakao').textContent = jobData.social?.kakao || '-';
    document.getElementById('telegram').textContent = jobData.social?.telegram || '-';
    
    // 상세 내용
    document.getElementById('adDetailContent').textContent = 
        jobData.adDetailContent || '-';
    
    // 통계 정보
    const stats = jobData.statistics || {};
    document.getElementById('clickCount').textContent = `${stats.click?.count || 0}회`;
    document.getElementById('recommendCount').textContent = `${stats.recommend?.count || 0}회`;
    document.getElementById('favoriteCount').textContent = `${stats.favorite?.count || 0}회`;
    
    // 기타 정보
    const statusElement = document.getElementById('status');
    const status = jobData.status || 'pending';
    const endDate = jobData.endDate ? new Date(jobData.endDate) : null;
    const isExpired = endDate && endDate < new Date();
    
    let statusText = '';
    let statusClass = '';
    
    // 마감일이 지났으면 만료로 표시
    if (isExpired || status === 'expired') {
        statusText = '만료';
        statusClass = 'status-expired';
    } else {
        switch(status) {
            case 'completed':
                statusText = '광고중';
                statusClass = 'status-completed';
                break;
            case 'pending':
                statusText = '심사중';
                statusClass = 'status-pending';
                break;
            default:
                statusText = status;
        }
    }
    
    statusElement.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
    
    // 등록일
    const createdAt = jobData.createdAt?.toDate ? 
        jobData.createdAt.toDate() : new Date(jobData.createdAt);
    document.getElementById('createdAt').textContent = 
        createdAt.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    
    // 가중치 점수
    document.getElementById('weightedScore').textContent = 
        (jobData.weighted_score || 0).toFixed(1);
    
    // 현재 배너 이미지
    const currentBannerContainer = document.getElementById('currentBannerContainer');
    if (jobData.businessImageUrl) {
        currentBannerContainer.innerHTML = 
            `<img src="${jobData.businessImageUrl}" alt="배너 이미지">`;
    } else {
        currentBannerContainer.innerHTML = '<p>등록된 배너가 없습니다.</p>';
    }
    
    // 상세 내용 이미지들
    const contentImagesContainer = document.getElementById('contentImagesContainer');
    if (jobData.contentImages && jobData.contentImages.length > 0) {
        contentImagesContainer.innerHTML = jobData.contentImages.map((imageUrl, index) => `
            <div class="content-image-item">
                <img src="${imageUrl}" alt="상세 이미지 ${index + 1}" onclick="showImageModal('${imageUrl}')">
                <button class="delete-btn" onclick="deleteContentImage('${imageUrl}', ${index})">&times;</button>
            </div>
        `).join('');
    } else {
        contentImagesContainer.innerHTML = '<p class="no-images">등록된 이미지가 없습니다.</p>';
    }
}