// 문의하기 페이지 전용 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 location 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location') || '알 수 없음';
    
    // 문의하기 제목 업데이트
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
        subtitle.textContent = `${location}에 대한 문의사항을 작성해주세요.`;
    }
    
    // 폼 제출 처리
    const inquiryForm = document.getElementById('inquiryForm');
    inquiryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 폼 데이터 수집
        const formData = {
            inquiryType: document.getElementById('inquiryType').value,
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            title: document.getElementById('title').value,
            content: document.getElementById('content').value,
            location: location,
            timestamp: new Date()
        };
        
        console.log('문의 제출:', formData);
        
        // 실제 구현 시 서버로 전송
        alert('문의가 접수되었습니다.');
        
        // 이전 페이지로 돌아가기
        history.back();
    });
});