// 파일경로: /js/imagekit-upload.js
// 파일이름: imagekit-upload.js

// ImageKit SDK가 로드될 때까지 대기
let imagekit = null;

// ImageKit 초기화 함수
function initializeImageKit() {
    if (typeof ImageKit !== 'undefined') {
        imagekit = new ImageKit({
            publicKey: "public_QPT5XZczBoiDTDV0KFeRhMM4Bzo=",
            urlEndpoint: "https://ik.imagekit.io/leadproject",
            authenticationEndpoint: "https://imagekit-auth-enujtcasca-uc.a.run.app"
        });
        console.log('ImageKit 초기화 완료');
        return true;
    }
    return false;
}

// SDK 로드 대기
function waitForImageKit() {
    return new Promise((resolve) => {
        if (initializeImageKit()) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (initializeImageKit()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // 5초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('ImageKit SDK 로드 타임아웃');
            }, 5000);
        }
    });
}

// 인증 정보 가져오기
async function getAuthenticationParameters() {
    try {
        const response = await fetch('https://imagekit-auth-enujtcasca-uc.a.run.app');
        if (!response.ok) {
            throw new Error('인증 실패');
        }
        const authParams = await response.json();
        console.log('인증 파라미터 받음:', authParams);
        return authParams;
    } catch (error) {
        console.error('인증 파라미터 가져오기 실패:', error);
        throw error;
    }
}

// ImageKit 업로드 함수
export async function uploadToImageKit(file, folder = 'general') {
    // SDK 로드 확인
    await waitForImageKit();
    
    if (!imagekit) {
        throw new Error('ImageKit SDK가 초기화되지 않았습니다.');
    }
    
    // 먼저 인증 정보를 가져옴
    const authParams = await getAuthenticationParameters();
    
    return new Promise((resolve, reject) => {
        const fileName = `${Date.now()}_${file.name}`;
        
        console.log('업로드 시작:', {
            fileName: fileName,
            folder: folder,
            fileSize: file.size,
            fileType: file.type
        });
        
        // 인증 정보와 함께 업로드
        imagekit.upload({
            file: file,
            fileName: fileName,
            folder: folder,
            useUniqueFileName: true,
            tags: [folder],
            signature: authParams.signature,
            expire: authParams.expire.toString(),  // 문자열로 변환
            token: authParams.token
        }, function(error, result) {
            if (error) {
                console.error('ImageKit 업로드 오류:', error);
                reject(error);
            } else {
                console.log('ImageKit 업로드 성공:', result);
                resolve({
                    url: result.url,
                    fileId: result.fileId,
                    thumbnailUrl: imagekit.url({
                        src: result.url,
                        transformation: [{
                            height: 300,
                            width: 300,
                            crop: "at_max"
                        }]
                    }),
                    name: result.name,
                    filePath: result.filePath
                });
            }
        });
    });
}

// 여러 이미지 업로드 함수
export async function uploadMultipleToImageKit(files, folder = 'general') {
    try {
        const uploadPromises = Array.from(files).map(file => uploadToImageKit(file, folder));
        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error) {
        console.error('다중 이미지 업로드 오류:', error);
        throw error;
    }
}

// 이미지 URL 생성 함수 (변환 옵션 포함)
export function getImageUrl(path, transformation = null) {
    if (!imagekit) {
        console.error('ImageKit가 초기화되지 않았습니다.');
        return path;
    }
    
    const options = {
        path: path
    };
    
    if (transformation) {
        options.transformation = transformation;
    }
    
    return imagekit.url(options);
}

// 썸네일 URL 생성 함수
export function getThumbnailUrl(url, width = 300, height = 300) {
    if (!imagekit) {
        console.error('ImageKit가 초기화되지 않았습니다.');
        return url;
    }
    
    return imagekit.url({
        src: url,
        transformation: [{
            height: height,
            width: width,
            crop: "at_max",
            quality: 80
        }]
    });
}

// 리사이즈된 이미지 URL 생성 함수
export function getResizedUrl(url, width, height, options = {}) {
    if (!imagekit) {
        console.error('ImageKit가 초기화되지 않았습니다.');
        return url;
    }
    
    const transformation = [{
        width: width,
        height: height,
        crop: options.crop || "at_max",
        quality: options.quality || 85
    }];
    
    if (options.blur) {
        transformation.push({
            blur: options.blur
        });
    }
    
    return imagekit.url({
        src: url,
        transformation: transformation
    });
}

// 페이지 로드시 자동 초기화
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        waitForImageKit().then(() => {
            console.log('ImageKit 준비 완료');
        });
    });
}