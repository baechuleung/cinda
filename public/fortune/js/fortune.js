// 파일 경로: fortune/js/fortune.js
// 파일 이름: fortune.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Functions URL (배포 후 실제 URL로 변경)
const FUNCTIONS_URL = 'https://us-central1-cinda-8b01c.cloudfunctions.net/get_fortune_from_gpt';

// 현재 날짜 설정
function setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
    
    document.getElementById('currentDate').textContent = `${year}년 ${month}월 ${date}일 ${day}요일`;
}

// 날짜 입력 유효성 검사
function validateDateInput() {
    const yearInput = document.getElementById('yearInput');
    const monthInput = document.getElementById('monthInput');
    const dayInput = document.getElementById('dayInput');
    
    // 년도 검증
    yearInput.addEventListener('input', function() {
        if (this.value.length > 4) {
            this.value = this.value.slice(0, 4);
        }
        const year = parseInt(this.value);
        if (year > new Date().getFullYear()) {
            this.value = new Date().getFullYear();
        }
    });
    
    // 월 검증
    monthInput.addEventListener('input', function() {
        if (this.value.length > 2) {
            this.value = this.value.slice(0, 2);
        }
        const month = parseInt(this.value);
        if (month > 12) {
            this.value = 12;
        } else if (month < 1 && this.value.length > 0) {
            this.value = 1;
        }
        updateMaxDay();
    });
    
    // 일 검증
    dayInput.addEventListener('input', function() {
        if (this.value.length > 2) {
            this.value = this.value.slice(0, 2);
        }
        updateMaxDay();
    });
}

// 해당 월의 최대 일수 업데이트
function updateMaxDay() {
    const year = parseInt(document.getElementById('yearInput').value) || 2000;
    const month = parseInt(document.getElementById('monthInput').value) || 1;
    const dayInput = document.getElementById('dayInput');
    
    if (month >= 1 && month <= 12) {
        const maxDay = new Date(year, month, 0).getDate();
        const currentDay = parseInt(dayInput.value);
        
        if (currentDay > maxDay) {
            dayInput.value = maxDay;
        } else if (currentDay < 1 && dayInput.value.length > 0) {
            dayInput.value = 1;
        }
    }
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
    setCurrentDate();
    validateDateInput();
    
    // 성별 버튼 이벤트
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 양력/음력 버튼 이벤트
    document.querySelectorAll('.calendar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.calendar-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 폼 제출 이벤트
    document.getElementById('submitBtn').addEventListener('click', async function() {
        const yearInput = document.getElementById('yearInput').value;
        const monthInput = document.getElementById('monthInput').value;
        const dayInput = document.getElementById('dayInput').value;
        
        // 입력값 확인
        if (!yearInput || !monthInput || !dayInput) {
            alert('생년월일을 모두 입력해주세요.');
            return;
        }
        
        // 생년월일 문자열 생성 (YYYYMMDD 형식)
        const birthInfo = `${yearInput}${monthInput.padStart(2, '0')}${dayInput.padStart(2, '0')}`;
        const selectedCalendar = document.querySelector('.calendar-btn.active');
        const calendarType = selectedCalendar ? selectedCalendar.dataset.calendar : 'solar';
        
        const selectedGender = document.querySelector('.gender-btn.active');
        const birthTime = document.getElementById('birthTime').value;
        
        if (!selectedGender) {
            alert('성별을 선택해주세요.');
            return;
        }
        
        // 로그인 확인
        if (!auth.currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        // 버튼 비활성화
        this.disabled = true;
        this.textContent = '운세를 불러오는 중...';
        
        try {
            // 오늘 날짜로 문서 ID 생성 (YYYY-MM-DD 형식)
            const today = new Date();
            const dateId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            // 입력 정보를 포함한 고유 ID 생성
            const uniqueId = `${dateId}_${birthInfo}_${calendarType}_${selectedGender.dataset.gender}_${birthTime || 'notime'}`;
            
            // Firestore에서 오늘의 운세 확인
            const userFortuneRef = doc(db, 'users', auth.currentUser.uid, 'fortune', uniqueId);
            const fortuneDoc = await getDoc(userFortuneRef);
            
            let fortune;
            
            if (fortuneDoc.exists()) {
                // 동일한 정보로 오늘의 운세가 있으면 가져오기
                console.log('기존 운세 데이터 사용');
                fortune = fortuneDoc.data().fortuneData;
            } else {
                // 없으면 새로 생성
                console.log('새로운 운세 생성');
                fortune = await getFortuneFromGPT({
                    birthDate: birthInfo,
                    gender: selectedGender.dataset.gender,
                    birthTime: birthTime
                });
                
                // Firestore에 저장
                try {
                    const saveData = {
                        fortuneData: fortune,
                        birthDate: birthInfo,
                        calendarType: calendarType,
                        gender: selectedGender.dataset.gender,
                        birthTime: birthTime || '',
                        createdAt: new Date(),
                        dateId: dateId,
                        uniqueId: uniqueId
                    };
                    
                    await setDoc(userFortuneRef, saveData);
                    console.log('운세 저장 완료!');
                } catch (saveError) {
                    console.error('Firestore 저장 오류:', saveError);
                }
            }
            
            // 결과 표시
            displayFortune(fortune);
            
        } catch (error) {
            console.error('운세 조회 오류:', error);
            alert(error.message || '운세 조회 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            // 버튼 복원
            this.disabled = false;
            this.textContent = '내 오늘의 운세 보기';
        }
    });
    
    // 로그인 상태 확인
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = '/auth/login.html';
        } else {
            // 사용자 정보 가져오기
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const displayName = userData.companyName || userData.nickname || '사용자';
                    document.getElementById('userName').textContent = `${displayName}님`;
                }
            } catch (error) {
                console.error('사용자 정보 조회 오류:', error);
                document.getElementById('userName').textContent = '사용자님';
            }
        }
    });
});
async function getFortuneFromGPT(userInfo) {
    try {
        // 현재 사용자의 ID 토큰 가져오기
        let idToken = null;
        if (auth.currentUser) {
            idToken = await auth.currentUser.getIdToken();
        }
        
        // Firebase Functions 호출
        const response = await fetch(FUNCTIONS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(idToken && { 'Authorization': `Bearer ${idToken}` })
            },
            body: JSON.stringify({
                birthDate: userInfo.birthDate,
                gender: userInfo.gender,
                birthTime: userInfo.birthTime
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('API 오류:', error);
            throw new Error(error.error || 'API 호출 실패');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
            // JSON 문자열을 파싱
            try {
                const fortuneData = JSON.parse(result.data);
                console.log('운세 데이터:', fortuneData);
                return fortuneData;
            } catch (parseError) {
                console.error('JSON 파싱 오류:', parseError);
                console.error('원본 데이터:', result.data);
                throw new Error('운세 데이터 형식 오류');
            }
        } else {
            throw new Error(result.error || '응답 형식 오류');
        }
        
    } catch (error) {
        console.error('운세 조회 오류:', error);
        throw error;
    }
}

// 운세 결과 표시
function displayFortune(fortuneData) {
    const resultDiv = document.getElementById('fortuneResult');
    const resultContent = document.getElementById('resultContent');
    
    // 운세 내용을 HTML로 구성
    const fortuneHTML = `
        <div class="fortune-section advice">
            <h3>오늘의 조언</h3>
            <img src="/img/fortune/noto_fortune-cookie.png" alt="fortune cookie">
            <p>${fortuneData.advice}</p>
        </div>
        
        <div class="fortune-section">
            <h3>📌 총운</h3>
            <p>${fortuneData.totalFortune}</p>
        </div>
        
        <div class="fortune-section">
            <h3>💝 애정운</h3>
            <p>${fortuneData.loveFortune}</p>
        </div>
        
        <div class="fortune-section">
            <h3>💰 금전운</h3>
            <p>${fortuneData.moneyFortune}</p>
        </div>
        
        <div class="fortune-section">
            <h3>🏥 건강운</h3>
            <p>${fortuneData.healthFortune}</p>
        </div>
        
        <div class="fortune-section dress-code">
            <h3>👔 오늘의 드레스 코드</h3>
            <p>${fortuneData.dressCode}</p>
        </div>
    `;
    
    resultContent.innerHTML = fortuneHTML;
    
    // 결과 영역 표시
    resultDiv.style.display = 'block';
    
    // 스크롤 이동
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}