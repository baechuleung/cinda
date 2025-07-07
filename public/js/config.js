// 전역 설정 파일
const CONFIG = {
    // 현재 경로에서 루트까지의 상대 경로 계산
    getRootPath: function() {
        const path = window.location.pathname;
        const depth = (path.match(/\//g) || []).length - 1;
        let rootPath = '';
        for (let i = 0; i < depth; i++) {
            rootPath += '../';
        }
        return rootPath || './';
    },
    
    // CSS 경로
    getCSSPath: function(filename) {
        return this.getRootPath() + 'css/' + filename;
    },
    
    // JS 경로
    getJSPath: function(filename) {
        return this.getRootPath() + 'js/' + filename;
    },
    
    // 이미지 경로
    getImagePath: function(filename) {
        return this.getRootPath() + 'img/' + filename;
    },
    
    // HTML 경로
    getHTMLPath: function(filename) {
        return this.getRootPath() + filename;
    }
};

// 헤더 로드 함수
async function loadHeader(containerId = 'header-container') {
    try {
        // 현재 위치에서 header.html까지의 상대 경로 계산
        const rootPath = CONFIG.getRootPath();
        const response = await fetch(rootPath + 'header.html');
        const text = await response.text();
        
        // 헤더 내용 삽입
        document.getElementById(containerId).innerHTML = text;
        
        // 삽입 후 경로 수정
        const container = document.getElementById(containerId);
        
        // CSS 링크 경로 수정
        const cssLinks = container.querySelectorAll('link[rel="stylesheet"]');
        cssLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('css/')) {
                link.setAttribute('href', rootPath + href);
            }
        });
        
        // 이미지 경로 수정
        const images = container.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && (src.startsWith('img/') || src.startsWith('../img/'))) {
                const filename = src.split('/').pop();
                img.setAttribute('src', rootPath + 'img/' + filename);
            }
        });
        
        // 링크 경로 수정
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('/')) {
                if (href.includes('.html')) {
                    link.setAttribute('href', rootPath + href);
                }
            }
        });
        
    } catch (error) {
        console.error('헤더 로딩 오류:', error);
    }
}

// 특정 HTML 파일 로드 함수
async function loadHTMLContent(filepath, containerId) {
    try {
        const response = await fetch(filepath);
        const text = await response.text();
        document.getElementById(containerId).innerHTML = text;
    } catch (error) {
        console.error('HTML 로딩 오류:', error);
    }
}

// 전역으로 사용 가능하도록 export
window.CONFIG = CONFIG;
window.loadHeader = loadHeader;
window.loadHTMLContent = loadHTMLContent;