import { auth, db, storage } from '/js/firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;
let postId = null;
let postData = null;
let selectedImages = [];
let existingImages = [];

// URL 파라미터에서 게시글 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
postId = urlParams.get('id');

if (!postId) {
    alert('잘못된 접근입니다.');
    window.location.href = 'list.html';
}

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = '/auth/login.html';
        return;
    }
    
    currentUser = user;
    
    // 게시글 로드
    await loadPost();
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
        
        // 작성자 확인
        if (currentUser.uid !== postData.authorId) {
            alert('수정 권한이 없습니다.');
            window.location.href = 'list.html';
            return;
        }
        
        // 기존 데이터 표시
        document.getElementById('title').value = postData.title;
        document.getElementById('content').value = postData.content;
        
        // 기존 이미지 표시
        if (postData.images && postData.images.length > 0) {
            existingImages = [...postData.images];
            displayExistingImages();
        }
        
    } catch (error) {
        console.error('게시글 로드 오류:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다.');
    }
}

// 기존 이미지 표시
function displayExistingImages() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    existingImages.forEach((url, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${url}" alt="기존 이미지">
            <button type="button" class="preview-remove" onclick="removeExistingImage(${index})">×</button>
        `;
        preview.appendChild(previewItem);
    });
    
    // 새로 선택한 이미지도 표시
    displayNewImages();
}

// 새 이미지 표시
function displayNewImages() {
    const preview = document.getElementById('imagePreview');
    
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="새 이미지">
                <button type="button" class="preview-remove" onclick="removeNewImage(${index})">×</button>
            `;
            preview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// 기존 이미지 제거
window.removeExistingImage = function(index) {
    existingImages.splice(index, 1);
    displayExistingImages();
};

// 새 이미지 제거
window.removeNewImage = function(index) {
    selectedImages.splice(index, 1);
    displayExistingImages();
};

// 이미지 선택 처리
document.getElementById('images').addEventListener('change', handleImageSelect);

function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    const totalImages = existingImages.length + selectedImages.length + files.length;
    
    // 최대 5개까지만 선택 가능
    if (totalImages > 5) {
        alert('이미지는 최대 5개까지 첨부할 수 있습니다.');
        return;
    }
    
    // 파일 크기 체크
    const validFiles = files.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name}은 5MB를 초과합니다.`);
            return false;
        }
        return true;
    });
    
    selectedImages = [...selectedImages, ...validFiles];
    displayExistingImages();
}

// 폼 제출 처리
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    
    if (!title || !content) {
        alert('제목과 내용을 입력해주세요.');
        return;
    }
    
    try {
        // 버튼 비활성화
        const submitBtn = e.target.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '수정 중...';
        
        // 새 이미지 업로드
        const newImageUrls = [];
        for (const image of selectedImages) {
            const timestamp = Date.now();
            const fileName = `community/${currentUser.uid}/${timestamp}_${image.name}`;
            const storageRef = ref(storage, fileName);
            
            const snapshot = await uploadBytes(storageRef, image);
            const downloadURL = await getDownloadURL(snapshot.ref);
            newImageUrls.push(downloadURL);
        }
        
        // 삭제된 이미지 처리 (Storage에서 삭제)
        const deletedImages = postData.images.filter(url => !existingImages.includes(url));
        for (const url of deletedImages) {
            try {
                const imageRef = ref(storage, url);
                await deleteObject(imageRef);
            } catch (error) {
                console.error('이미지 삭제 실패:', error);
            }
        }
        
        // 게시글 업데이트
        const updateData = {
            title: title,
            content: content,
            images: [...existingImages, ...newImageUrls],
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(doc(db, 'community_posts', postId), updateData);
        
        alert('게시글이 수정되었습니다.');
        window.location.href = `view.html?id=${postId}`;
        
    } catch (error) {
        console.error('게시글 수정 오류:', error);
        alert('게시글 수정 중 오류가 발생했습니다.');
        
        // 버튼 활성화
        const submitBtn = e.target.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '수정';
    }
});