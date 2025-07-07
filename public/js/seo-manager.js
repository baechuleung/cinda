// SEO 메타태그 동적 관리 클래스
class SEOManager {
    constructor() {
        this.baseUrl = window.location.origin;
        this.siteName = 'CINDA';
        this.defaultAuthor = 'CINDA Team';
        this.defaultImage = '/img/og-default.jpg';
    }

    // 페이지별 SEO 설정
    getPageSEO(pageName) {
        const seoData = {
            'login': {
                title: '로그인 - CINDA',
                description: 'CINDA 서비스 로그인 페이지입니다. 안전하고 편리한 로그인을 제공합니다.',
                keywords: 'CINDA, 로그인, 회원, 인증',
                ogTitle: 'CINDA 로그인',
                ogDescription: 'CINDA 서비스에 로그인하여 다양한 기능을 이용하세요.',
                schemaType: 'WebPage'
            },
            'register': {
                title: '회원가입 - CINDA',
                description: 'CINDA 회원가입 페이지입니다. 개인회원과 기업회원 중 선택하여 가입하세요.',
                keywords: 'CINDA, 회원가입, 개인회원, 기업회원, 가입',
                ogTitle: 'CINDA 회원가입',
                ogDescription: '지금 CINDA에 가입하고 다양한 혜택을 누리세요.',
                schemaType: 'WebPage'
            },
            'register-individual': {
                title: '개인회원 가입 - CINDA',
                description: 'CINDA 개인회원 가입 페이지입니다. 간편하게 가입하고 서비스를 이용하세요.',
                keywords: 'CINDA, 개인회원, 회원가입, 개인가입',
                ogTitle: 'CINDA 개인회원 가입',
                ogDescription: '개인회원으로 가입하여 CINDA의 다양한 서비스를 경험하세요.',
                schemaType: 'WebPage'
            },
            'register-business': {
                title: '기업회원 가입 - CINDA',
                description: 'CINDA 기업회원 가입 페이지입니다. 기업 전용 서비스를 이용하세요.',
                keywords: 'CINDA, 기업회원, 사업자, 회원가입, 기업가입',
                ogTitle: 'CINDA 기업회원 가입',
                ogDescription: '기업회원으로 가입하여 비즈니스 전용 기능을 활용하세요.',
                schemaType: 'WebPage'
            },
            'dashboard': {
                title: '대시보드 - CINDA',
                description: 'CINDA 대시보드에서 모든 서비스를 한눈에 관리하세요.',
                keywords: 'CINDA, 대시보드, 관리, 서비스',
                ogTitle: 'CINDA 대시보드',
                ogDescription: 'CINDA 대시보드에서 편리하게 서비스를 이용하세요.',
                schemaType: 'WebApplication'
            },
            'index': {
                title: 'CINDA - 혁신적인 서비스 플랫폼',
                description: 'CINDA는 개인과 기업을 위한 혁신적인 서비스 플랫폼입니다.',
                keywords: 'CINDA, 플랫폼, 서비스, 개인, 기업',
                ogTitle: 'CINDA - 혁신적인 서비스 플랫폼',
                ogDescription: 'CINDA와 함께 새로운 경험을 시작하세요.',
                schemaType: 'WebSite'
            }
        };

        return seoData[pageName] || seoData['index'];
    }

    // 현재 페이지 분석
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        
        if (path.includes('/auth/login')) return 'login';
        if (path.includes('/auth/register-individual')) return 'register-individual';
        if (path.includes('/auth/register-business')) return 'register-business';
        if (path.includes('/auth/register')) return 'register';
        if (path.includes('dashboard')) return 'dashboard';
        if (filename === '' || filename === 'index') return 'index';
        
        return 'index';
    }

    // 메타태그 동적 삽입
    async injectSEOTags() {
        try {
            // header.sub.html 템플릿 로드
            const response = await fetch('/header.sub.html');
            const template = await response.text();
            
            // 현재 페이지 정보 가져오기
            const currentPage = this.getCurrentPage();
            const seoData = this.getPageSEO(currentPage);
            const currentUrl = window.location.href;
            
            // 템플릿 변수 치환
            let processedHTML = template
                .replace(/{{title}}/g, seoData.title)
                .replace(/{{description}}/g, seoData.description)
                .replace(/{{keywords}}/g, seoData.keywords)
                .replace(/{{author}}/g, this.defaultAuthor)
                .replace(/{{ogTitle}}/g, seoData.ogTitle || seoData.title)
                .replace(/{{ogDescription}}/g, seoData.ogDescription || seoData.description)
                .replace(/{{ogImage}}/g, this.baseUrl + this.defaultImage)
                .replace(/{{ogUrl}}/g, currentUrl)
                .replace(/{{siteName}}/g, this.siteName)
                .replace(/{{twitterTitle}}/g, seoData.ogTitle || seoData.title)
                .replace(/{{twitterDescription}}/g, seoData.ogDescription || seoData.description)
                .replace(/{{twitterImage}}/g, this.baseUrl + this.defaultImage)
                .replace(/{{canonicalUrl}}/g, currentUrl)
                .replace(/{{schemaType}}/g, seoData.schemaType)
                .replace(/{{schemaName}}/g, seoData.title)
                .replace(/{{schemaDescription}}/g, seoData.description)
                .replace(/{{schemaUrl}}/g, currentUrl);
            
            // head에 삽입
            const head = document.querySelector('head');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = processedHTML;
            
            // 기존 메타태그 제거 (중복 방지)
            const existingMeta = head.querySelectorAll('meta[name="description"], meta[name="keywords"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]');
            existingMeta.forEach(tag => tag.remove());
            
            // 새 메타태그 삽입
            while (tempDiv.firstChild) {
                head.appendChild(tempDiv.firstChild);
            }
            
            // 동적 title 변경
            document.title = seoData.title;
            
        } catch (error) {
            console.error('SEO 태그 삽입 오류:', error);
        }
    }

    // sitemap.xml 생성을 위한 URL 목록
    getUrlList() {
        return [
            { url: '/', priority: '1.0', changefreq: 'weekly' },
            { url: '/html/auth/login.html', priority: '0.8', changefreq: 'monthly' },
            { url: '/html/auth/register.html', priority: '0.8', changefreq: 'monthly' },
            { url: '/html/auth/register-individual.html', priority: '0.7', changefreq: 'monthly' },
            { url: '/html/auth/register-business.html', priority: '0.7', changefreq: 'monthly' },
            { url: '/dashboard.html', priority: '0.9', changefreq: 'daily' }
        ];
    }
}

// SEO Manager 초기화
const seoManager = new SEOManager();

// DOM 로드 시 SEO 태그 삽입
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        seoManager.injectSEOTags();
    });
} else {
    seoManager.injectSEOTags();
}

export { seoManager };