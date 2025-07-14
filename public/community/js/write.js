import { auth, db, storage } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;
let isAdmin = false;
let quill = null;

// Quill 에디터 초기화
function initializeQuill() {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // 텍스트 스타일
        ['blockquote', 'code-block'],                      // 블록
        [{ 'header': 1 }, { 'header': 2 }],               // 헤더
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],     // 리스트
        [{ 'script': 'sub'}, { 'script': 'super' }],      // 위첨자/아래첨자
        [{ 'indent': '-1'}, { 'indent': '+1' }],          // 들여쓰기
        [{ 'direction': 'rtl' }],                          // 텍스트 방향
        [{ 'size': ['small', false, 'large', 'huge'] }],  // 크기
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],       // 헤더 레벨
        [{ 'color': [] }, { 'background': [] }],          // 색상
        [{ 'font': [] }],                                  // 폰트
        [{ 'align': [] }],                                 // 정렬
        ['clean'],                                         // 포맷 제거
        ['link', 'image', 'video']                        // 링크, 이미지, 비디오
    ];

    quill = new Quill('#editor', {
        modules: {
            toolbar: toolbarOptions
        },
        theme: 'snow',
        placeholder: '내용을 입력하세요...'
    });

    // 이미지 핸들러 커스터마이징
    quill.getModule('toolbar').addHandler('image', imageHandler);
}

// 이미지 업로드 핸들러
function imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    
    input.addEventListener('change', async () => {
        const file = input.files[0];
        
        if (file) {
            // 파일 크기 체크 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('이미지 크기는 10MB 이하여야 합니다.');
                return;
            }
            
            try {
                // 로딩 표시
                const range = quill.getSelection(true);
                quill.insertText(range.index, '이미지 업로드 중...');
                
                // Firebase Storage에 업로드
                const timestamp = Date.now();
                const fileName = `community/${currentUser.uid}/${timestamp}_${file.name}`;
                const storageRef = ref(storage, fileName);
                
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                
                // 로딩 텍스트 제거
                quill.deleteText(range.index, '이미지 업로드 중...'.length);
                
                // 이미지 삽입
                quill.insertEmbed(range.index, 'image', downloadURL);
                
            } catch (error) {
                console.error('이미지 업로드 오류:', error);
                
                // 오류 메시지 개선
                if (error.code === 'storage/unauthorized') {
                    alert('이미지 업로드 권한이 없습니다. 로그인 상태를 확인해주세요.');
                } else if (error.code === 'storage/canceled') {
                    alert('이미지 업로드가 취소되었습니다.');
                } else if (error.code === 'storage/unknown') {
                    alert('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                } else {
                    alert('이미지 업로드 중 오류가 발생했습니다: ' + error.message);
                }
                
                // 로딩 텍스트 제거
                const range = quill.getSelection(true);
                if (range) {
                    quill.deleteText(range.index, '이미지 업로드 중...'.length);
                }
            }
        }
    });
    
    input.click();
}

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
    
    // Quill 에디터 초기화
    initializeQuill();
});

// 게시글 작성 폼 제출
document.getElementById('writeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const content = quill.root.innerHTML.trim();
    const contentText = quill.getText().trim();
    const isNotice = isAdmin && document.getElementById('isNotice').checked;
    
    if (!title || !contentText) {
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
        
        // Quill 에디터에서 이미지 URL 추출
        const images = [];
        const imgElements = quill.root.querySelectorAll('img');
        imgElements.forEach(img => {
            if (img.src) {
                images.push(img.src);
            }
        });
        
        // 게시글 데이터
        const postData = {
            title: title,
            content: content,           // HTML 내용
            contentText: contentText,   // 일반 텍스트 (검색용)
            authorId: currentUser.uid,
            authorName: authorName,
            images: images,             // 이미지 URL 배열
            views: 0,
            likeCount: 0,
            commentCount: 0,
            isNotice: isNotice,
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