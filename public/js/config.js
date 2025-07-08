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
        // 헤더 CSS가 이미 로드되었는지 확인
        const headerCSSExists = Array.from(document.styleSheets).some(sheet => 
            sheet.href && sheet.href.includes('/css/header.css')
        );
        
        if (!headerCSSExists) {
            // 헤더 CSS 먼저 로드
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/header.css';
            document.head.appendChild(link);
            
            // CSS 로드 대기
            await new Promise(resolve => {
                link.onload = resolve;
                setTimeout(resolve, 100); // 최대 100ms 대기
            });
        }
        
        // 절대 경로로 header.html 로드
        const response = await fetch('/header.html');
        const text = await response.text();
        
        // 헤더 내용 삽입
        document.getElementById(containerId).innerHTML = text;
        
        // innerHTML로 삽입된 스크립트는 실행되지 않으므로 재실행
        const container = document.getElementById(containerId);
        const scripts = container.querySelectorAll('script');
        
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.type = oldScript.type || 'text/javascript';
            
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                // 인라인 스크립트 내용 복사
                newScript.textContent = oldScript.textContent;
            }
            
            // 기존 스크립트를 새 스크립트로 교체
            oldScript.parentNode.replaceChild(newScript, oldScript);
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