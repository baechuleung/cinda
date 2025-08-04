// 파일경로: /partner/js/partner-list.js
// 파일이름: partner-list.js

import { auth, db, rtdb } from '/js/firebase-config.js';
import { ref as rtdbRef, get, query, orderByChild, limitToFirst } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { toggleFavorite, checkIfFavorited, watchFavoriteStatus, toggleRecommend, checkIfRecommended, watchRecommendStatus } from './partner-interactions.js';

let allPartners = [];
let filteredPartners = [];
let region1Data = [];
let region2Data = {};
let selectedRegion1 = '';
let selectedRegion2 = '';
let selectedCategory = '전체업종';

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', async function() {
    await loadRegionData();
    await loadBusinessTypes();
    await loadPartnerList();
    setupEventListeners();
});

// 지역 데이터 로드
async function loadRegionData() {
    try {
        // region1 데이터 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Json = await region1Response.json();
        region1Data = region1Json.regions;
        
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
    region1Data.forEach(region => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = region.name;
        option.dataset.value = region.name;
        option.addEventListener('click', function() {
            selectRegion1(region.name, region.name, region.code);
        });
        region1Options.appendChild(option);
    });
}

// 지역1 선택
function selectRegion1(value, name, code) {
    selectedRegion1 = value;
    document.querySelector('#region1Selected .selected-text').textContent = name;
    
    // 지역2 초기화
    selectedRegion2 = '';
    document.querySelector('#region2Selected .selected-text').textContent = '지역선택';
    
    // 지역2 옵션 업데이트
    if (code && region2Data[code]) {
        loadRegion2(region2Data[code]);
    } else {
        const region2Options = document.getElementById('region2Options');
        region2Options.innerHTML = '<div class="dropdown-option disabled">먼저 도시를 선택해주세요</div>';
    }
    
    // 필터링
    filterPartners();
}

// 지역2 로드
function loadRegion2(region2List) {
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
    
    // 지역2 옵션 추가
    region2List.forEach(name => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = name;
        option.dataset.value = name;
        option.addEventListener('click', function() {
            selectRegion2(name, name);
        });
        region2Options.appendChild(option);
    });
}

// 지역2 선택
function selectRegion2(code, name) {
    selectedRegion2 = code;
    document.querySelector('#region2Selected .selected-text').textContent = name;
    filterPartners();
}

// 업종 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/partner-types.json');
        const data = await response.json();
        
        const categoryOptions = document.getElementById('categoryOptions');
        categoryOptions.innerHTML = '';
        
        // 전체업종 옵션
        const allOption = document.createElement('div');
        allOption.className = 'dropdown-option';
        allOption.textContent = '전체업종';
        allOption.dataset.value = '전체업종';
        allOption.addEventListener('click', function() {
            selectCategory('전체업종');
        });
        categoryOptions.appendChild(allOption);
        
        // 업종 옵션 추가
        data.partnerTypes.forEach(type => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.textContent = type.name;
            option.dataset.value = type.name;
            option.addEventListener('click', function() {
                selectCategory(type.name);
            });
            categoryOptions.appendChild(option);
        });
    } catch (error) {
        console.error('업종 데이터 로드 오류:', error);
    }
}

// 업종 선택
function selectCategory(category) {
    selectedCategory = category;
    document.querySelector('#categorySelected .selected-text').textContent = category;
    filterPartners();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 드롭다운 토글
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    dropdowns.forEach(dropdown => {
        const selected = dropdown.querySelector('.dropdown-selected');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        selected.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // 다른 드롭다운 닫기
            dropdowns.forEach(d => {
                if (d !== dropdown) {
                    d.querySelector('.dropdown-selected').classList.remove('active');
                    d.querySelector('.dropdown-menu').style.display = 'none';
                }
            });
            
            // 현재 드롭다운 토글
            this.classList.toggle('active');
            menu.style.display = this.classList.contains('active') ? 'block' : 'none';
        });
    });
    
    // 외부 클릭시 드롭다운 닫기
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-selected').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
    });
    
    // 검색어 입력
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        filterPartners();
    });
}

// 제휴서비스 목록 로드 - Realtime Database에서
async function loadPartnerList() {
    try {
        const partnerList = document.getElementById('partnerList');
        const emptyState = document.getElementById('emptyState');
        
        partnerList.innerHTML = '<div style="text-align: center; padding: 20px;">로딩중...</div>';
        
        // 인증 상태 확인
        if (!auth.currentUser) {
            console.log('로그인 대기 중...');
            
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
        
        allPartners = [];
        
        // Realtime Database에서 데이터 가져오기
        const partnersRef = rtdbRef(rtdb, 'ad_partner');
        const snapshot = await get(partnersRef);
        
        if (snapshot.exists()) {
            const partnersData = snapshot.val();
            
            // 객체를 배열로 변환
            Object.keys(partnersData).forEach(key => {
                const partnerData = {
                    id: key,
                    ...partnersData[key]
                };
                
                // status가 completed, active, pending 중 하나인 것만 추가
                if (partnerData.status === 'completed' || partnerData.status === 'active' || partnerData.status === 'pending') {
                    allPartners.push(partnerData);
                }
            });
            
            // weighted_score로 정렬 (내림차순)
            allPartners.sort((a, b) => {
                const scoreA = a.weighted_score || 0;
                const scoreB = b.weighted_score || 0;
                return scoreB - scoreA;
            });
            
            // 상위 5개 제휴서비스 로그
            if (allPartners.length > 0) {
                console.log('=== 상위 5개 제휴서비스 ===');
                allPartners.slice(0, 5).forEach((partner, index) => {
                    console.log(`${index + 1}. ${partner.businessName}, ${partner.contactName} - 점수: ${(partner.weighted_score || 0).toFixed(2)}`);
                });
            }
        }
        
        // 화면에 표시
        if (allPartners.length === 0) {
            partnerList.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            displayPartners();
        }
        
    } catch (error) {
        console.error('제휴서비스 목록 로드 오류:', error);
        
        document.getElementById('partnerList').innerHTML = 
            '<div style="text-align: center; padding: 20px; color: #999;">제휴서비스를 불러오는데 실패했습니다.<br>로그인 상태를 확인해주세요.</div>';
    }
}

// 제휴서비스 필터링
function filterPartners() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    filteredPartners = allPartners.filter(partner => {
        // 지역1 필터
        if (selectedRegion1 && partner.region1 !== selectedRegion1) {
            return false;
        }
        
        // 지역2 필터
        if (selectedRegion2 && partner.region2 !== selectedRegion2) {
            return false;
        }
        
        // 업종 필터
        if (selectedCategory !== '전체업종' && partner.businessType !== selectedCategory) {
            return false;
        }
        
        // 검색어 필터
        if (searchText && !partner.businessName.toLowerCase().includes(searchText)) {
            return false;
        }
        
        return true;
    });
    
    displayPartners();
}

// 제휴서비스 표시
function displayPartners() {
    const partnerList = document.getElementById('partnerList');
    const emptyState = document.getElementById('emptyState');
    const partnersToDisplay = filteredPartners.length > 0 || selectedRegion1 || selectedRegion2 || selectedCategory !== '전체업종' || document.getElementById('searchInput').value ?
        filteredPartners : allPartners;
    
    // 결과 카운트 업데이트
    document.querySelector('.results-count span').textContent = partnersToDisplay.length;
    
    if (partnersToDisplay.length === 0) {
        partnerList.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        partnerList.innerHTML = '';
        
        partnersToDisplay.forEach((partner, index) => {
            const partnerCard = createPartnerCard(partner);
            partnerList.appendChild(partnerCard);
            
            // 마지막 카드가 아니면 구분선 추가
            if (index < partnersToDisplay.length - 1) {
                const divider = document.createElement('div');
                divider.className = 'card-divider';
                partnerList.appendChild(divider);
            }
        });
    }
}

// 제휴서비스 카드 생성
function createPartnerCard(partner) {
    const card = document.createElement('div');
    card.className = 'partner-card';
    card.style.position = 'relative';
    
    // 카드 내용
    const cardContent = document.createElement('div');
    cardContent.className = 'partner-card-content';
    
    // 업체 이미지
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'business-image-wrapper';
    
    const imageDiv = document.createElement('div');
    if (partner.businessImageUrl) {
        const img = document.createElement('img');
        img.src = partner.businessImageUrl;
        img.alt = partner.businessName;
        img.className = 'business-image';
        imageWrapper.appendChild(img);
    } else {
        imageDiv.className = 'business-image';
        imageDiv.textContent = '🏢';
        imageWrapper.appendChild(imageDiv);
    }
    
    // 정보 영역
    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'partner-info-wrapper';
    
    // 첫 번째 줄: 업체명, 지역
    const firstLine = document.createElement('div');
    firstLine.className = 'info-first-line';
    const regionText = partner.region1 && partner.region2 ?
        `${partner.region1}/${partner.region2}` : (partner.region1 || partner.region2 || '지역정보없음');
    
    // 업체명과 지역을 span으로 분리
    firstLine.innerHTML = `
        <span class="contact-name">${partner.businessName || '업체명'}</span>
        <span class="region-tag">${regionText}</span>
    `;
    
    // 두 번째 줄: 프로모션 정보
    const secondLine = document.createElement('div');
    secondLine.className = 'info-second-line';
    secondLine.innerHTML = `<span class="discount-type">${partner.promotionTitle || '프로모션 정보'}</span>`;
    
    // 세 번째 줄: 업종
    const thirdLine = document.createElement('div');
    thirdLine.className = 'info-third-line';
    thirdLine.textContent = `${partner.businessType || '업종'}`;
    
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
    recommendButton.dataset.partnerId = partner.id;
    recommendButton.dataset.userId = partner.userId;
    
    // 찜 버튼
    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'icon-btn heart-btn';
    favoriteButton.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    favoriteButton.dataset.partnerId = partner.id;
    favoriteButton.dataset.userId = partner.userId;
    
    // 공유 버튼
    const shareButton = document.createElement('button');
    shareButton.className = 'icon-btn share-btn';
    shareButton.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.59 13.51L15.42 17.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15.41 6.51L8.59 10.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    shareButton.dataset.partnerId = partner.id;
    shareButton.dataset.userId = partner.userId;
    
    // 초기 상태 확인
    checkIfRecommended(partner.id, partner.userId).then(isRecommended => {
        if (isRecommended) {
            recommendButton.classList.add('recommended');
        }
    });
    
    checkIfFavorited(partner.id, partner.userId).then(isFavorited => {
        if (isFavorited) {
            favoriteButton.classList.add('favorited');
        }
    });
    
    // 아이콘 조립
    iconSection.appendChild(recommendButton);
    iconSection.appendChild(favoriteButton);
    iconSection.appendChild(shareButton);
    
    // 카드 조립
    cardContent.appendChild(imageWrapper);
    cardContent.appendChild(infoWrapper);
    cardContent.appendChild(iconSection);
    card.appendChild(cardContent);
    
    // 클릭 이벤트
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.icon-btn')) {
            window.location.href = `partner-detail.html?id=${partner.id}&userId=${partner.userId}`;
        }
    });
    
    // 추천 클릭 이벤트
    recommendButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const isRecommended = await toggleRecommend(partner.id, partner.userId);
        if (isRecommended) {
            recommendButton.classList.add('recommended');
        } else {
            recommendButton.classList.remove('recommended');
        }
    });
    
    // 찜 클릭 이벤트
    favoriteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const isFavorited = await toggleFavorite(partner.id, partner.userId);
        if (isFavorited) {
            favoriteButton.classList.add('favorited');
        } else {
            favoriteButton.classList.remove('favorited');
        }
    });
    
    // 공유 클릭 이벤트
    shareButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const shareUrl = `${window.location.origin}/partner/partner-detail.html?id=${partner.id}&userId=${partner.userId}`;
        
        try {
            await navigator.clipboard.writeText(shareUrl);
            
            // 복사 완료 알림
            const alertDiv = document.createElement('div');
            alertDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                z-index: 10000;
                font-size: 14px;
            `;
            alertDiv.textContent = '링크가 복사되었습니다!';
            document.body.appendChild(alertDiv);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 2000);
        } catch (err) {
            console.error('복사 실패:', err);
            alert('링크 복사에 실패했습니다.');
        }
    });
    
    // 상태 실시간 감시
    watchRecommendStatus(partner.id, partner.userId, (isRecommended) => {
        if (isRecommended) {
            recommendButton.classList.add('recommended');
        } else {
            recommendButton.classList.remove('recommended');
        }
    });
    
    watchFavoriteStatus(partner.id, partner.userId, (isFavorited) => {
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