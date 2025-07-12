import { auth, db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;
let selectedImages = [];
let isAdmin = false;

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = '/auth/login.html';
        return;
    }
    
    currentUser = user;
    
    // 글쓰기 권한 확인
    let hasWritePermission = false;
    
    // admin_users 확인
    const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));
    if (adminDoc.exists()) {
        hasWritePermission = true;
        isAdmin = true;
        // 관리자인 경우 공지사항 체크박스 표시
        document.getElementById('noticeGroup').style.display = 'block';
    } else {
        // individual_users의 gender 확인
        const individualDoc = await getDoc(doc(db, 'individual_users', user.uid));
        if (individualDoc.exists() && individualDoc.data().gender === 'female') {
            hasWritePermission = true;
        }
    }
    
    if (!hasWritePermission) {
        alert('글쓰기 권한이 없습니다.');
        window.location.href = 'list.html';
        return;
    }
});

// 이미지 선택 처리
document.getElementById('images').addEventListener('change', handleImageSelect);

function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    
    // 최대 5개까지만 선택 가능
    if (selectedImages.length + files.length > 5) {
        alert('이미지는 최대 5개까지 첨부할 수 있습니다.');
        e.target.value = '';
        return;
    }
    
    // 파일 크기 체크 (각 파일 10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
        alert('10MB를 초과하는 파일이 있습니다.');
        e.target.value = '';
        return;
    }
    
    // 이미지 파일만 허용
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        e.target.value = '';
        return;
    }
    
    selectedImages = [...selectedImages, ...imageFiles];
    displaySelectedImages();
}

// 선택한 이미지 표시
function displaySelectedImages() {
    const preview = document.getElementById('imagePreview');
    
    if (selectedImages.length === 0) {
        preview.innerHTML = '';
        return;
    }
    
    preview.innerHTML = `
        <div class="image-preview-container">
            ${selectedImages.map((image, index) => `
                <div class="image-preview-item">
                    <img src="${URL.createObjectURL(image)}" alt="미리보기">
                    <button type="button" class="remove-image-btn" onclick="removeImage(${index})">×</button>
                </div>
            `).join('')}
        </div>
    `;
}

// 이미지 제거
window.removeImage = function(index) {
    selectedImages.splice(index, 1);
    displaySelectedImages();
    
    // 파일 입력 초기화
    if (selectedImages.length === 0) {
        document.getElementById('images').value = '';
    }
};

// 게시글 작성 폼 제출
document.getElementById('writeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const isNotice = isAdmin && document.getElementById('isNotice').checked;
    
    if (!title || !content) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }
    
    try {
        // 버튼 비활성화
        const submitBtn = e.target.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';
        
        // 사용자 정보 가져오기
        let authorName = currentUser.displayName || '';
        
        // displayName이 없으면 Firestore에서 가져오기
        if (!authorName) {
            // 개인회원 확인
            const individualDoc = await getDoc(doc(db, 'individual_users', currentUser.uid));
            if (individualDoc.exists()) {
                authorName = individualDoc.data().nickname || individualDoc.data().name || `사용자${currentUser.uid.slice(-4)}`;
            } else {
                // 기업회원 확인
                const businessDoc = await getDoc(doc(db, 'business_users', currentUser.uid));
                if (businessDoc.exists()) {
                    authorName = businessDoc.data().nickname || businessDoc.data().name || `사용자${currentUser.uid.slice(-4)}`;
                }
            }
        }
        
        // 이미지 업로드
        const imageUrls = [];
        for (const image of selectedImages) {
            const timestamp = Date.now();
            const fileName = `community/${currentUser.uid}/${timestamp}_${image.name}`;
            const storageRef = ref(storage, fileName);
            
            const snapshot = await uploadBytes(storageRef, image);
            const downloadURL = await getDownloadURL(snapshot.ref);
            imageUrls.push(downloadURL);
        }
        
        // 게시글 데이터
        const postData = {
            title: title,
            content: content,
            authorId: currentUser.uid,
            authorName: authorName,
            images: imageUrls,
            views: 0,  // 조회수 초기값 추가
            likeCount: 0,  // 좋아요 초기값 추가
            commentCount: 0,
            isNotice: isNotice,  // 공지사항 여부 추가
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // Firestore에 저장
        const docRef = await addDoc(collection(db, 'community_posts'), postData);
        
        alert('게시글이 등록되었습니다.');
        window.location.href = `view.html?id=${docRef.id}`;
        
    } catch (error) {
        console.error('게시글 등록 오류:', error);
        alert('게시글 등록 중 오류가 발생했습니다.');
        
        // 버튼 활성화
        const submitBtn = e.target.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '등록';
    }
});

// 취소 버튼
document.querySelector('.cancel-btn').addEventListener('click', () => {
    if (confirm('작성을 취소하시겠습니까?')) {
        window.location.href = 'list.html';
    }
});