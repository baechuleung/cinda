// 파일 경로: fortune/js/fortune.js
// 파일 이름: fortune.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// GPT API 키 (실제 사용시 환경변수나 서버에서 관리해야 함)
const GPT_API_KEY = 'YOUR_API_KEY_HERE';

// 현재 날짜 설정
function setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
    
    document.getElementById('currentDate').textContent = `${year}년 ${month}월 ${date}일 ${day}요일`;
    document.getElementById('resultDate')?.setAttribute('data-date', `${year}-${month}-${date}`);
}

// 성별 버튼 이벤트
document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// 폼 제출 이벤트
document.getElementById('submitBtn').addEventListener('click', async function() {
    // 입력값 확인
    const birthInfo = document.getElementById('birthInfo').value;
    const selectedGender = document.querySelector('.gender-btn.active');
    const birthTime = document.getElementById('birthTime').value;
    
    if (!birthInfo) {
        alert('생년월일을 입력해주세요.');
        return;
    }
    
    if (!selectedGender) {
        alert('성별을 선택해주세요.');
        return;
    }
    
    // 버튼 비활성화
    this.disabled = true;
    this.textContent = '운세를 불러오는 중...';
    
    try {
        // GPT API 호출
        const fortune = await getFortuneFromGPT({
            birthDate: birthInfo,
            gender: selectedGender.dataset.gender,
            birthTime: birthTime
        });
        
        // 결과 표시
        displayFortune(fortune);
        
    } catch (error) {
        console.error('운세 조회 오류:', error);
        alert('운세 조회 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        // 버튼 복원
        this.disabled = false;
        this.textContent = '내 오늘의 운세 보기';
    }
});

// GPT API를 통한 운세 조회
async function getFortuneFromGPT(userInfo) {
    const today = new Date();
    const prompt = `
오늘은 ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일입니다.
생년월일: ${userInfo.birthDate}
성별: ${userInfo.gender === 'male' ? '남성' : '여성'}
${userInfo.birthTime ? `태어난 시간: ${userInfo.birthTime}시` : ''}

위 정보를 바탕으로 오늘의 운세를 다음 항목으로 나누어 상세히 알려주세요:
1. 총운
2. 애정운
3. 금전운
4. 건강운
5. 오늘의 행운 숫자
6. 오늘의 행운 색상
7. 조언

한국식 운세 해석 스타일로 친근하고 희망적인 톤으로 작성해주세요.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GPT_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '당신은 전문적인 한국식 운세 상담사입니다. 사주명리학과 동양철학에 기반하여 친근하고 희망적인 운세를 제공합니다.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8,
            max_tokens: 1000
        })
    });

    if (!response.ok) {
        throw new Error('GPT API 호출 실패');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// 운세 결과 표시
function displayFortune(fortune) {
    const resultDiv = document.getElementById('fortuneResult');
    const resultContent = document.getElementById('resultContent');
    
    // 현재 날짜 설정
    const today = new Date();
    document.getElementById('resultDate').textContent = 
        `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    
    // 운세 내용 표시
    resultContent.textContent = fortune;
    
    // 결과 영역 표시
    resultDiv.style.display = 'block';
    
    // 스크롤 이동
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
    setCurrentDate();
    
    // 로그인 상태 확인
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = '/auth/login.html';
        }
    });
});