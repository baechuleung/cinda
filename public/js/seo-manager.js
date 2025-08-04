// seo-manager.js

(function() {
    // 현재 페이지의 경로 가져오기
    const currentPath = window.location.pathname;
    
    // 도메인 설정 (실제 도메인으로 변경 필요)
    const canonicalDomain = 'https://bamda.net';
    
    // Canonical URL 생성
    const canonicalURL = canonicalDomain + currentPath;
    
    // Canonical 링크 태그 생성 및 추가
    const canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    canonicalLink.href = canonicalURL;
    document.head.appendChild(canonicalLink);
    
    // 현재 페이지의 메타 태그에서 정보 가져오기
    const getMetaContent = (name) => {
        const meta = document.querySelector(`meta[name="${name}"]`);
        return meta ? meta.content : '';
    };
    
    const pageTitle = document.title || '';
    const pageDescription = getMetaContent('description');
    const pageKeywords = getMetaContent('keywords');
    const pageAuthor = getMetaContent('author');
    
    // Open Graph 태그 추가
    const ogTags = [
        { property: 'og:url', content: canonicalURL },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: pageDescription },
        { property: 'og:site_name', content: 'BAMDA' },
        { property: 'og:locale', content: 'ko_KR' },
        { property: 'og:image', content: canonicalDomain + '/img/og-default.jpg' } // 기본 이미지
    ];
    
    // Twitter Card 태그 추가
    const twitterTags = [
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: pageTitle },
        { name: 'twitter:description', content: pageDescription },
        { name: 'twitter:image', content: canonicalDomain + '/img/og-default.jpg' }
    ];
    
    // Open Graph 메타 태그 생성 및 추가
    ogTags.forEach(tag => {
        const meta = document.createElement('meta');
        meta.setAttribute('property', tag.property);
        meta.content = tag.content;
        document.head.appendChild(meta);
    });
    
    // Twitter 메타 태그 생성 및 추가
    twitterTags.forEach(tag => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', tag.name);
        meta.content = tag.content;
        document.head.appendChild(meta);
    });
    
    // 구조화된 데이터 (JSON-LD) 추가
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": pageTitle,
        "description": pageDescription,
        "url": canonicalURL,
        "inLanguage": "ko-KR",
        "publisher": {
            "@type": "Organization",
            "name": "BAMDA",
            "url": canonicalDomain
        }
    };
    
    const scriptTag = document.createElement('script');
    scriptTag.type = 'application/ld+json';
    scriptTag.textContent = JSON.stringify(structuredData);
    document.head.appendChild(scriptTag);
    
    console.log('SEO Manager: Canonical URL and meta tags added successfully');
})();