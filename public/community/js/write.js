import { auth, db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;
let selectedImages = [];

// 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = '/auth/login.html';
        return;
    }
    
    currentUser = user;
});

// 이미지 선택 처리
document.getElementById('images').addEventListener('change', handleImageSelect);

function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    
    // 최대 5개까지만 선택 가능
    if (selectedImages.length + files.length > 5) {
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
    displayImagePreview();
}

// 이미지 미리보기 표시
function displayImagePreview() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="미리보기">
                <button type="button" class="preview-remove" onclick="removeImage(${index})">×</button>
            `;
            preview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// 이미지 제거
window.removeImage = function(index) {
    selectedImages.splice(index, 1);
    displayImagePreview();
    
    // 파일 입력 초기화
    document.getElementById('images').value = '';
};

// 폼 제출 처리
document.getElementById('writeForm').addEventListener('submit', async (e) => {
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
            views: 0,
            commentCount: 0,
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