// 파일경로: /js/imagekit-upload.js
// 파일이름: imagekit-upload.js

// ImageKit SDK 초기화
const imagekit = new ImageKit({
    publicKey: "public_1K/Qc6PfDe1K9E6+vNkT3Eg/IvI=",
    urlEndpoint: "https://ik.imagekit.io/bamda",
    authenticationEndpoint: "https://bamda-server.fly.dev/auth/imagekit"
});

// ImageKit 업로드 함수
export async function uploadToImageKit(file, folder = 'general') {
    return new Promise((resolve, reject) => {
        const fileName = `${Date.now()}_${file.name}`;
        
        imagekit.upload({
            file: file,
            fileName: fileName,
            folder: folder,
            useUniqueFileName: true,
            tags: [folder]
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

// 이미지 삭제 함수 (필요한 경우 사용)
export async function deleteFromImageKit(fileId) {
    // ImageKit 삭제는 서버 사이드에서만 가능
    // 클라이언트에서는 서버 API를 호출해야 함
    try {
        const response = await fetch('https://bamda-server.fly.dev/api/imagekit/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileId })
        });
        
        if (!response.ok) {
            throw new Error('이미지 삭제 실패');
        }
        
        return await response.json();
    } catch (error) {
        console.error('ImageKit 삭제 오류:', error);
        throw error;
    }
}