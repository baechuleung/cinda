// 지역 및 업종 데이터 로드 함수
async function loadRegionAndBusinessData() {
    try {
        // region1 데이터 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        const region1Select = document.getElementById('region1Search');
        if (region1Select) {
            region1Data.regions.forEach(region => {
                const option = new Option(region.name, region.name);
                option.setAttribute('data-code', region.code);
                region1Select.add(option);
            });
        }
        
        // region2 데이터 로드
        const region2Response = await fetch('/data/region2.json');
        const region2Data = await region2Response.json();
        window.region2Data = region2Data; // 전역 변수로 저장
        
        // region1 변경 이벤트 리스너
        region1Select.addEventListener('change', function() {
            updateRegion2Options(this.selectedOptions[0]?.getAttribute('data-code'));
        });
        
        // business-types 데이터 로드
        const businessResponse = await fetch('/data/business-types.json');
        const businessData = await businessResponse.json();
        
        const businessSelect = document.getElementById('businessTypeSearch');
        if (businessSelect) {
            // 기존 옵션 제거 (첫 번째 '업종 선택' 옵션 제외)
            while (businessSelect.options.length > 1) {
                businessSelect.remove(1);
            }
            
            // business-types.json에서 가져온 데이터로 옵션 추가
            businessData.businessTypes.forEach(type => {
                const option = new Option(type.name, type.name);
                businessSelect.add(option);
            });
        }
        
    } catch (error) {
        console.error('데이터 로드 오류:', error);
    }
}

// region2 옵션 업데이트 함수
function updateRegion2Options(region1Code) {
    const region2Select = document.getElementById('region2Search');
    
    // 기존 옵션 제거
    region2Select.innerHTML = '<option value="">도시를 선택하세요</option>';
    
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

// 지역 검색 함수 - 전역으로 등록
window.searchByLocation = function() {
    const businessType = document.getElementById('businessTypeSearch').value;
    const region1 = document.getElementById('region1Search').value;
    const region2 = document.getElementById('region2Search').value;
    const storeName = document.getElementById('storeNameSearch').value.trim();
    
    // 최소 하나의 검색 조건이 입력되었는지 확인
    if (!businessType && !region1 && !region2 && !storeName) {
        alert('최소 하나의 검색 조건을 입력해주세요.');
        return;
    }
    
    // 검색 이벤트 발생
    const searchEvent = new CustomEvent('locationSearch', {
        detail: {
            businessType: businessType,
            region1: region1,
            region2: region2,
            storeName: storeName
        }
    });
    
    document.dispatchEvent(searchEvent);
    console.log('지역 검색:', searchEvent.detail);
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRegionAndBusinessData);
} else {
    loadRegionAndBusinessData();
}