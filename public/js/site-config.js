// 사이트 전역 설정 - 절대 경로 관리
const SITE_CONFIG = {
    // 절대 경로 자동 계산
    getAbsolutePath(path) {
        // 현재 프로토콜과 호스트 가져오기
        const origin = window.location.origin; // http://localhost:5000 or https://cinda-8b01c.web.app
        
        // 슬래시로 시작하지 않으면 추가
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        return origin + path;
    },
    
    // JS 파일 절대 경로
    getJSPath(filename) {
        return this.getAbsolutePath('/js/' + filename);
    },
    
    // CSS 파일 절대 경로
    getCSSPath(filename) {
        return this.getAbsolutePath('/css/' + filename);
    },
    
    // 이미지 파일 절대 경로
    getImagePath(filename) {
        return this.getAbsolutePath('/img/' + filename);
    }
};

// 전역 사용
window.SITE_CONFIG = SITE_CONFIG;