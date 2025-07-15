// 파일 경로: /public/advertise/js/ad-form-job.js

import { auth, db } from '/js/firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 채용관 광고 폼 초기화
export async function initJobAdForm(userData, selectedAdType, adPrice) {
    // 선택한 광고 제목 표시
    if (selectedAdType) {
        const titleElement = document.getElementById('selectedAdTitle');
        if (titleElement) {
            titleElement.textContent = selectedAdType.name;
        }
    }
    
    // 기업회원 정보로 폼 자동 채우기 (읽기 전용 필드)
    if (userData) {
        document.getElementById('businessName2').value = userData.storeName || '';
        document.getElementById('contactName2').value = userData.name || '';
        document.getElementById('contactPhone2').value = userData.phone || '';
        document.getElementById('contactEmail2').value = userData.email || '';
        document.getElementById('businessType').value = userData.businessType || '';
    }
    
    // 먼저 region1 옵션을 로드
    try {
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        const region1Select = document.getElementById('region1');
        if (region1Select) {
            // 기존 옵션 제거 (첫 번째 옵션 제외)
            while (region1Select.options.length > 1) {
                region1Select.remove(1);
            }
            
            // region1 옵션 추가
            region1Data.regions.forEach(region => {
                const option = new Option(region.name, region.name);
                option.setAttribute('data-code', region.code);
                region1Select.add(option);
            });
            
            // 회원정보에서 region1, region2 설정
            if (userData && userData.region1) {
                region1Select.value = userData.region1;
                
                // region2 옵션 로드 후 값 설정
                const selectedRegion = region1Data.regions.find(r => r.name === userData.region1);
                if (selectedRegion) {
                    // region2 데이터 로드
                    const region2Response = await fetch('/data/region2.json');
                    const region2Data = await region2Response.json();
                    
                    const region2Select = document.getElementById('region2');
                    
                    // 기존 옵션 제거
                    region2Select.innerHTML = '<option value="">시/군/구를 선택하세요</option>';
                    
                    // 선택된 region1에 해당하는 region2 옵션 추가
                    const cities = region2Data[selectedRegion.code];
                    if (cities) {
                        cities.forEach(city => {
                            const option = new Option(city, city);
                            region2Select.add(option);
                        });
                    }
                    
                    if (userData.region2) {
                        region2Select.value = userData.region2;
                    }
                }
                
                // 지역 선택 비활성화 (읽기 전용)
                region1Select.disabled = true;
                document.getElementById('region2').disabled = true;
            }
        }
    } catch (error) {
        console.error('지역 데이터 로드 오류:', error);
    }
    
    // 최소 날짜 설정
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate2');
    if (startDateInput) {
        startDateInput.setAttribute('min', tomorrowStr);
        startDateInput.value = tomorrowStr;
    }
    
    // 금액 업데이트
    updateJobAdAmount(adPrice);
}

// region2 옵션 업데이트 함수
function updateRegion2OptionsForJob(region1Code) {
    const region2Select = document.getElementById('region2');
    
    // 기존 옵션 제거
    region2Select.innerHTML = '<option value="">시/군/구를 선택하세요</option>';
    
    if (!region1Code || !window.region2Data) return;
    
    // 선택된 region1에 해당하는 region2 옵션 추가
    const cities = window.region2Data[region1Code];
    if (cities) {
        cities.forEach(city => {
            const option = new Option(city, city);
            region2Select.add(option);
        });
    }
}

// 채용관 광고 금액 업데이트
export function updateJobAdAmount(adPrice) {
    const duration = parseInt(document.getElementById('duration2').value) || 0;
    const totalPrice = adPrice * duration;
    
    document.getElementById('monthlyAmount2').textContent = adPrice.toLocaleString() + '원';
    document.getElementById('adDuration2').textContent = duration + '개월';
    document.getElementById('totalAmount2').textContent = totalPrice.toLocaleString() + '원';
}

// 채용관 광고 폼 제출
export async function submitJobAdForm(currentUser, selectedAdType, adPrice) {
    const form = document.getElementById('jobAdvertiseForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        try {
            // 근무 시간 데이터 수집
            const workTimes = [];
            const workTimeItems = document.querySelectorAll('.work-time-item');
            workTimeItems.forEach(item => {
                const title = item.querySelector('.time-title').value.trim();
                const startHour = item.querySelector('.start-hour').value;
                const startMinute = item.querySelector('.start-minute').value;
                const endHour = item.querySelector('.end-hour').value;
                const endMinute = item.querySelector('.end-minute').value;
                
                if (title && startHour && startMinute && endHour && endMinute) {
                    workTimes.push({
                        title: title,
                        startTime: `${startHour}:${startMinute}`,
                        endTime: `${endHour}:${endMinute}`
                    });
                }
            });
            
            if (workTimes.length === 0) {
                alert('최소 하나의 근무 시간을 입력해주세요.');
                return;
            }
            
            const formData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                adType: selectedAdType.type,
                adCategory: 'job',
                adName: selectedAdType.name,
                businessName: document.getElementById('businessName2').value.trim(),
                businessType: document.getElementById('businessType').value.trim(),
                contactName: document.getElementById('contactName2').value.trim(),
                contactPhone: document.getElementById('contactPhone2').value.trim(),
                contactEmail: document.getElementById('contactEmail2').value.trim(),
                workRegion1: document.getElementById('region1').value,
                workRegion2: document.getElementById('region2').value,
                salaryType: document.querySelector('input[name="salaryType"]:checked')?.value || '',
                salary: document.getElementById('salary').value.trim(),
                workTimes: workTimes,
                welfare: document.getElementById('welfare').value.trim(),
                additionalRequest: document.getElementById('additionalRequest').value.trim(),
                kakaoLink: document.getElementById('kakaoLink2').value.trim(),
                startDate: document.getElementById('startDate2').value,
                duration: parseInt(document.getElementById('duration2').value),
                monthlyAmount: adPrice,
                totalAmount: adPrice * parseInt(document.getElementById('duration2').value),
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // 이미지 파일 처리
            const imageFile = document.getElementById('jobImage').files[0];
            if (imageFile) {
                formData.hasImage = true;
                formData.imageName = imageFile.name;
                formData.imageSize = imageFile.size;
                // TODO: Firebase Storage에 이미지 업로드
            }
            
            await addDoc(collection(db, 'ad_requests'), formData);
            alert('광고 신청이 완료되었습니다.\n검토 후 연락드리겠습니다.');
            window.location.href = '/advertise/html/ad-list.html';
            
        } catch (error) {
            console.error('광고 신청 오류:', error);
            alert('광고 신청 중 오류가 발생했습니다.');
        }
    });
}

// 파일 업로드 유효성 검사
document.getElementById('jobImage')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 파일은 5MB 이하만 업로드 가능합니다.');
            e.target.value = '';
            return;
        }
        
        // 파일 형식 체크
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            alert('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF)');
            e.target.value = '';
            return;
        }
    }
});