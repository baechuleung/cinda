// 파일경로: /job/js/job-list.js
// 파일이름: job-list.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, where, getDocs, doc, collectionGroup, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { toggleFavorite, checkIfFavorited, watchFavoriteStatus, toggleRecommend, checkIfRecommended, watchRecommendStatus } from './job-interactions.js';

let allJobs = [];
let filteredJobs = [];
let region1Data = null;
let region2Data = null;
let selectedRegion1 = '';
let selectedRegion2 = '';
let selectedCategory = '전체업종';

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', async function() {
    await loadRegionData();
    await loadBusinessTypes();
    await loadJobList();
    setupEventListeners();
});

// 지역 데이터 로드
async function loadRegionData() {
    try {
        // region1 데이터 로드
        const region1Response = await fetch('/data/region1.json');
        region1Data = await region1Response.json();
        
        // region2 데이터 로드
        const region2Response = await fetch('/data/region2.json');
        region2Data = await region2Response.json();
        
        // region1 드롭다운 생성
        loadRegion1();
    } catch (error) {
        console.error('지역 데이터 로드 오류:', error);
    }
}

// 지역1 로드
function loadRegion1() {
    const region1Options = document.getElementById('region1Options');
    region1Options.innerHTML = '';
    
    // 전체 옵션
    const allOption = document.createElement('div');
    allOption.className = 'dropdown-option';
    allOption.textContent = '전체';
    allOption.dataset.value = '';
    allOption.addEventListener('click', function() {
        selectRegion1('', '전체', '');
    });
    region1Options.appendChild(allOption);
    
    // 지역1 옵션 추가
    region1Data.regions.forEach(region => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.dataset.value = region.name;
        option.textContent = region.name;
        option.addEventListener('click', function() {
            selectRegion1(region.name, region.name, region.code);
        });
        region1Options.appendChild(option);
    });
}

// 지역1 선택
function selectRegion1(value, text, code) {
    const selectedDiv = document.getElementById('region1Selected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const menu = document.getElementById('region1Menu');
    
    // 값 설정
    selectedText.textContent = text;
    selectedRegion1 = value;
    
    // 선택된 옵션 표시
    document.querySelectorAll('#region1Options .dropdown-option').forEach(option => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // 드롭다운 닫기
    selectedDiv.classList.remove('active');
    menu.style.display = 'none';
    
    // 지역2 초기화 및 업데이트
    resetRegion2();
    if (code) {
        updateRegion2Options(code);
    }
    
    // 필터 적용
    filterJobs();
}

// 지역2 옵션 업데이트
function updateRegion2Options(region1Code) {
    const region2Options = document.getElementById('region2Options');
    region2Options.innerHTML = '';
    
    // 전체 옵션
    const allOption = document.createElement('div');
    allOption.className = 'dropdown-option';
    allOption.textContent = '전체';
    allOption.dataset.value = '';
    allOption.addEventListener('click', function() {
        selectRegion2('', '전체');
    });
    region2Options.appendChild(allOption);
    
    if (region2Data && region2Data[region1Code]) {
        region2Data[region1Code].forEach(region => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = region;
            option.textContent = region;
            option.addEventListener('click', function() {
                selectRegion2(region, region);
            });
            region2Options.appendChild(option);
        });
    }
}

// 지역2 초기화
function resetRegion2() {
    const selectedDiv = document.getElementById('region2Selected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const options = document.getElementById('region2Options');
    
    selectedText.textContent = '지역선택';
    selectedRegion2 = '';
    
    // 기본 메시지 표시
    options.innerHTML = '<div class="dropdown-option disabled">도시를 먼저 선택하세요</div>';
}

// 지역2 선택
function selectRegion2(value, text) {
    const selectedDiv = document.getElementById('region2Selected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const menu = document.getElementById('region2Menu');
    
    // 값 설정
    selectedText.textContent = text;
    selectedRegion2 = value;
    
    // 선택된 옵션 표시
    document.querySelectorAll('#region2Options .dropdown-option').forEach(option => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // 드롭다운 닫기
    selectedDiv.classList.remove('active');
    menu.style.display = 'none';
    
    // 필터 적용
    filterJobs();
}

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        const categoryOptions = document.getElementById('categoryOptions');
        categoryOptions.innerHTML = '';
        
        // 전체업종 옵션
        const allOption = document.createElement('div');
        allOption.className = 'dropdown-option';
        allOption.textContent = '전체업종';
        allOption.addEventListener('click', () => selectCategory('전체업종'));
        categoryOptions.appendChild(allOption);
        
        // 업종별 옵션
        data.businessTypes.forEach(type => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.textContent = type.name;
            option.addEventListener('click', () => selectCategory(type.name));
            categoryOptions.appendChild(option);
        });
    } catch (error) {
        console.error('업종 데이터 로드 오류:', error);
    }
}

// 업종 선택
function selectCategory(category) {
    selectedCategory = category;
    const selectedDiv = document.getElementById('categorySelected');
    const selectedText = selectedDiv.querySelector('.selected-text');
    const menu = document.getElementById('categoryMenu');
    
    selectedText.textContent = category;
    selectedDiv.classList.remove('active');
    menu.style.display = 'none';
    
    filterJobs();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 지역1 드롭다운
    const region1Selected = document.getElementById('region1Selected');
    const region1Menu = document.getElementById('region1Menu');
    
    region1Selected.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = region1Menu.style.display === 'block';
        region1Menu.style.display = isOpen ? 'none' : 'block';
        this.classList.toggle('active', !isOpen);
    });
    
    // 지역2 드롭다운
    const region2Selected = document.getElementById('region2Selected');
    const region2Menu = document.getElementById('region2Menu');
    
    region2Selected.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // 지역1이 선택되지 않은 경우
        if (!selectedRegion1) {
            alert('도시를 먼저 선택해주세요.');
            return;
        }
        
        const isOpen = region2Menu.style.display === 'block';
        region2Menu.style.display = isOpen ? 'none' : 'block';
        this.classList.toggle('active', !isOpen);
    });
    
    // 업종 드롭다운
    const categorySelected = document.getElementById('categorySelected');
    const categoryMenu = document.getElementById('categoryMenu');
    
    categorySelected.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = categoryMenu.style.display === 'block';
        categoryMenu.style.display = isOpen ? 'none' : 'block';
        this.classList.toggle('active', !isOpen);
    });
    
    // 검색 입력
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterJobs);
    
    // 외부 클릭시 드롭다운 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.filter-dropdown')) {
            document.getElementById('region1Menu').style.display = 'none';
            document.getElementById('region2Menu').style.display = 'none';
            document.getElementById('categoryMenu').style.display = 'none';
            document.getElementById('region1Selected').classList.remove('active');
            document.getElementById('region2Selected').classList.remove('active');
            document.getElementById('categorySelected').classList.remove('active');
        }
    });
}

// 채용정보 목록 로드 - weighted_score 필드 사용
async function loadJobList() {
    try {
        const jobList = document.getElementById('jobList');
        const emptyState = document.getElementById('emptyState');
        
        jobList.innerHTML = '<div style="text-align: center; padding: 20px;">로딩중...</div>';
        
        // 로그인 상태 확인
        if (!auth.currentUser) {
            console.log('로그인되지 않은 상태입니다. 로그인 대기 중...');
            
            // 인증 상태 변경 대기
            await new Promise((resolve) => {
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    if (user) {
                        console.log('로그인 확인됨');
                        unsubscribe();
                        resolve();
                    }
                });
                
                // 3초 후에도 로그인 안되면 진행
                setTimeout(() => {
                    unsubscribe();
                    resolve();
                }, 3000);
            });
        }
        
        allJobs = [];
        
        // collectionGroup을 사용하여 weighted_score 필드로만 정렬
        const jobsQuery = query(
            collectionGroup(db, 'ad_business'),
            orderBy('weighted_score', 'desc'),
            limit(3000)  // 3000개까지 가져오기
        );
        
        console.log('쿼리 실행 중...');
        const snapshot = await getDocs(jobsQuery);
        console.log('쿼리 완료, 문서 수:', snapshot.size);
        
        snapshot.forEach((doc) => {
            const jobData = {
                id: doc.id,
                userId: doc.ref.parent.parent.id,
                ...doc.data()
            };
            
            // status가 completed 또는 active인 것만 추가
            if (jobData.status === 'completed' || jobData.status === 'active') {
                allJobs.push(jobData);
            }
        });
        
        // 상위 5개 채용정보 로그
        if (allJobs.length > 0) {
            console.log('=== 상위 5개 채용정보 ===');
            allJobs.slice(0, 5).forEach((job, index) => {
                console.log(`${index + 1}. ${job.businessName}, ${job.contactName} - 점수: ${(job.weighted_score || 0).toFixed(2)}`);
            });
        }
        
        // 화면에 표시
        if (allJobs.length === 0) {
            jobList.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            displayJobs();
        }
        
    } catch (error) {
        console.error('채용정보 목록 로드 오류:', error);
        
        // 인덱스 오류인 경우
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            console.log('복합 인덱스가 필요합니다. Firebase Console에서 인덱스를 생성해주세요.');
            console.log('필요한 인덱스: weighted_score(Descending)');
        }
        // 권한 오류인 경우
        else if (error.code === 'permission-denied') {
            console.log('권한이 없습니다. 로그인 상태를 확인해주세요.');
        }
        
        document.getElementById('jobList').innerHTML = 
            '<div style="text-align: center; padding: 20px; color: #999;">채용정보를 불러오는데 실패했습니다.<br>로그인 상태를 확인해주세요.</div>';
    }
}

// 채용정보 필터링
function filterJobs() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    filteredJobs = allJobs.filter(job => {
        // 지역1 필터
        if (selectedRegion1 && job.region1 !== selectedRegion1) {
            return false;
        }
        
        // 지역2 필터
        if (selectedRegion2 && job.region2 !== selectedRegion2) {
            return false;
        }
        
        // 업종 필터
        if (selectedCategory !== '전체업종' && job.businessType !== selectedCategory) {
            return false;
        }
        
        // 검색어 필터
        if (searchText && !job.businessName.toLowerCase().includes(searchText)) {
            return false;
        }
        
        return true;
    });
    
    displayJobs();
}

// 채용정보 표시
function displayJobs() {
    const jobList = document.getElementById('jobList');
    const emptyState = document.getElementById('emptyState');
    const jobsToDisplay = filteredJobs.length > 0 || selectedRegion1 || selectedRegion2 || selectedCategory !== '전체업종' || document.getElementById('searchInput').value ? filteredJobs : allJobs;
    
    // 결과 카운트 업데이트
    document.querySelector('.results-count span').textContent = jobsToDisplay.length;
    
    if (jobsToDisplay.length === 0) {
        jobList.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        jobList.innerHTML = '';
        
        jobsToDisplay.forEach((job, index) => {
            const jobCard = createJobCard(job);
            jobList.appendChild(jobCard);
            
            // 마지막 카드가 아니면 구분선 추가
            if (index < jobsToDisplay.length - 1) {
                const divider = document.createElement('div');
                divider.className = 'card-divider';
                jobList.appendChild(divider);
            }
        });
    }
}

// 채용정보 카드 생성
function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.style.position = 'relative';
    
    // 카드 내용
    const cardContent = document.createElement('div');
    cardContent.className = 'job-card-content';
    
    // 업체 이미지
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'business-image-wrapper';
    
    const imageDiv = document.createElement('div');
    if (job.businessImageUrl) {
        const img = document.createElement('img');
        img.src = job.businessImageUrl;
        img.alt = job.businessName;
        img.className = 'business-image';
        imageWrapper.appendChild(img);
    } else {
        imageDiv.className = 'business-image';
        imageDiv.textContent = '🏢';
        imageWrapper.appendChild(imageDiv);
    }
    
    // 정보 영역
    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'job-info-wrapper';
    
    // 첫 번째 줄: 담당자명, 지역
    const firstLine = document.createElement('div');
    firstLine.className = 'info-first-line';
    const regionText = job.region1 && job.region2 ? 
        `${job.region1}/${job.region2}` : (job.region1 || job.region2 || '지역정보없음');
    
    // 담당자명과 지역을 span으로 분리
    firstLine.innerHTML = `
        <span class="contact-name">${job.contactName || '담당자'}</span>
        <span class="region-tag">${regionText}</span>
    `;
    
    // 두 번째 줄: 업체명 - 업종
    const secondLine = document.createElement('div');
    secondLine.className = 'info-second-line';
    secondLine.textContent = `${job.businessName || '업체명'} - ${job.businessType || '업종'}`;
    
    // 세 번째 줄: 급여타입 급여
    const thirdLine = document.createElement('div');
    thirdLine.className = 'info-third-line';
    thirdLine.innerHTML = `<span class="salary-type">${job.salaryType || '시급'}</span> <span class="salary-amount">${formatPrice(job.salary)}원</span>`;
    
    // 정보 조립
    infoWrapper.appendChild(firstLine);
    infoWrapper.appendChild(secondLine);
    infoWrapper.appendChild(thirdLine);
    
    // 아이콘 섹션
    const iconSection = document.createElement('div');
    iconSection.className = 'icon-section';
    
    // 추천 버튼
    const recommendButton = document.createElement('button');
    recommendButton.className = 'icon-btn thumb-btn';
    recommendButton.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 22V11M2 13V20C2 21.1046 2.89543 22 4 22H17.4262C18.907 22 20.1662 20.9197 20.3914 19.4562L21.4416 12.4562C21.7362 10.5389 20.2858 8.7 18.3514 8.7H14V4C14 2.89543 13.1046 2 12 2C11.4477 2 11 2.44772 11 3V4.2C11 4.77565 10.8189 5.33708 10.4803 5.80806L7.5 9.8V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    recommendButton.dataset.jobId = job.id;
    recommendButton.dataset.userId = job.userId;
    
    // 찜 버튼
    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'icon-btn heart-btn';
    favoriteButton.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    favoriteButton.dataset.jobId = job.id;
    favoriteButton.dataset.userId = job.userId;
    
    // 초기 상태 확인
    checkIfRecommended(job.id, job.userId).then(isRecommended => {
        if (isRecommended) {
            recommendButton.classList.add('recommended');
        }
    });
    
    checkIfFavorited(job.id, job.userId).then(isFavorited => {
        if (isFavorited) {
            favoriteButton.classList.add('favorited');
        }
    });
    
    // 아이콘 조립
    iconSection.appendChild(recommendButton);
    iconSection.appendChild(favoriteButton);
    
    // 카드 조립
    cardContent.appendChild(imageWrapper);
    cardContent.appendChild(infoWrapper);
    cardContent.appendChild(iconSection);
    card.appendChild(cardContent);
    
    // 클릭 이벤트
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.icon-btn')) {
            window.location.href = `job-detail.html?id=${job.id}&userId=${job.userId}`;
        }
    });
    
    // 추천 클릭 이벤트
    recommendButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const isRecommended = await toggleRecommend(job.id, job.userId);
        if (isRecommended) {
            recommendButton.classList.add('recommended');
        } else {
            recommendButton.classList.remove('recommended');
        }
    });
    
    // 찜 클릭 이벤트
    favoriteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const isFavorited = await toggleFavorite(job.id, job.userId);
        if (isFavorited) {
            favoriteButton.classList.add('favorited');
        } else {
            favoriteButton.classList.remove('favorited');
        }
    });
    
    // 상태 실시간 감시
    watchRecommendStatus(job.id, job.userId, (isRecommended) => {
        if (isRecommended) {
            recommendButton.classList.add('recommended');
        } else {
            recommendButton.classList.remove('recommended');
        }
    });
    
    watchFavoriteStatus(job.id, job.userId, (isFavorited) => {
        if (isFavorited) {
            favoriteButton.classList.add('favorited');
        } else {
            favoriteButton.classList.remove('favorited');
        }
    });
    
    return card;
}

// 가격 포맷팅
function formatPrice(price) {
    if (!price) return '0';
    return parseInt(price).toLocaleString();
}