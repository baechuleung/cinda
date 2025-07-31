// 파일경로: /partner/js/partner-interactions.js
// 파일이름: partner-interactions.js

import { auth, db } from '/js/firebase-config.js';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;

// 인증 상태 감시
onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// 찜하기 토글
export async function toggleFavorite(partnerId, userId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return false;
    }
    
    try {
        const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
        const isFavorited = await checkIfFavorited(partnerId, userId);
        
        if (isFavorited) {
            // 찜 취소
            await updateDoc(partnerRef, {
                'statistics.favorite.count': increment(-1),
                'statistics.favorite.users': arrayRemove(currentUser.uid)
            });
            return false;
        } else {
            // 찜 추가
            await updateDoc(partnerRef, {
                'statistics.favorite.count': increment(1),
                'statistics.favorite.users': arrayUnion(currentUser.uid)
            });
            return true;
        }
    } catch (error) {
        console.error('찜하기 처리 오류:', error);
        alert('찜하기 처리 중 오류가 발생했습니다.');
        return false;
    }
}

// 찜 상태 확인
export async function checkIfFavorited(partnerId, userId) {
    if (!currentUser) return false;
    
    return new Promise((resolve) => {
        const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
        const unsubscribe = onSnapshot(partnerRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const favoriteUsers = data.statistics?.favorite?.users || [];
                resolve(favoriteUsers.includes(currentUser.uid));
            } else {
                resolve(false);
            }
            unsubscribe();
        });
    });
}

// 클릭 기록
export async function recordClick(partnerId, userId) {
    if (!currentUser) {
        console.log('로그인하지 않은 사용자의 클릭은 기록하지 않습니다.');
        return;
    }
    
    try {
        const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
        
        // 현재 문서 데이터 가져오기
        const partnerDoc = await getDoc(partnerRef);
        
        if (!partnerDoc.exists()) {
            console.error('제휴서비스가 존재하지 않습니다.');
            return;
        }
        
        const partnerData = partnerDoc.data();
        const currentStatistics = partnerData.statistics || {
            recommend: { count: 0, users: [] },
            click: { count: 0, users: [] },
            favorite: { count: 0, users: [] }
        };
        
        // 클릭 데이터가 배열인지 확인하고 초기화
        if (!Array.isArray(currentStatistics.click.users)) {
            currentStatistics.click.users = [];
        }
        
        // 이미 클릭한 사용자인지 확인 (UID 중복 체크)
        const alreadyClicked = currentStatistics.click.users.some(click => 
            click.uid === currentUser.uid
        );
        
        if (alreadyClicked) {
            console.log('이미 조회한 제휴서비스입니다.');
            return;
        }
        
        // 클릭 데이터
        const clickData = {
            uid: currentUser.uid,
            date: new Date().toISOString()
        };
        
        // 클릭 추가
        await updateDoc(partnerRef, {
            'statistics.click.count': increment(1),
            'statistics.click.users': arrayUnion(clickData)
        });
        
        console.log('클릭이 기록되었습니다.');
    } catch (error) {
        console.error('클릭 기록 오류:', error);
    }
}

// 찜 상태 실시간 감시 (UI 업데이트용)
export function watchFavoriteStatus(partnerId, userId, callback) {
    if (!currentUser) {
        callback(false);
        return () => {};
    }
    
    const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
    
    const unsubscribe = onSnapshot(partnerRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            const favoriteUsers = data.statistics?.favorite?.users || [];
            callback(favoriteUsers.includes(currentUser.uid));
        } else {
            callback(false);
        }
    });
    
    return unsubscribe;
}

// 추천하기 토글
export async function toggleRecommend(partnerId, userId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return false;
    }
    
    try {
        const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
        const isRecommended = await checkIfRecommended(partnerId, userId);
        
        if (isRecommended) {
            // 추천 취소
            await updateDoc(partnerRef, {
                'statistics.recommend.count': increment(-1),
                'statistics.recommend.users': arrayRemove(currentUser.uid)
            });
            return false;
        } else {
            // 추천 추가
            await updateDoc(partnerRef, {
                'statistics.recommend.count': increment(1),
                'statistics.recommend.users': arrayUnion(currentUser.uid)
            });
            return true;
        }
    } catch (error) {
        console.error('추천하기 처리 오류:', error);
        alert('추천하기 처리 중 오류가 발생했습니다.');
        return false;
    }
}

// 추천 상태 확인
export async function checkIfRecommended(partnerId, userId) {
    if (!currentUser) return false;
    
    return new Promise((resolve) => {
        const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
        const unsubscribe = onSnapshot(partnerRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const recommendUsers = data.statistics?.recommend?.users || [];
                resolve(recommendUsers.includes(currentUser.uid));
            } else {
                resolve(false);
            }
            unsubscribe();
        });
    });
}

// 추천 상태 실시간 감시
export function watchRecommendStatus(partnerId, userId, callback) {
    if (!currentUser) {
        callback(false);
        return () => {};
    }
    
    const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
    
    const unsubscribe = onSnapshot(partnerRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            const recommendUsers = data.statistics?.recommend?.users || [];
            callback(recommendUsers.includes(currentUser.uid));
        } else {
            callback(false);
        }
    });
    
    return unsubscribe;
}

// 통계 데이터 가져오기
export async function getStatistics(partnerId, userId) {
    try {
        return new Promise((resolve) => {
            const partnerRef = doc(db, 'users', userId, 'ad_business', partnerId);
            const unsubscribe = onSnapshot(partnerRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    resolve(data.statistics || {
                        recommend: { count: 0, users: [] },
                        click: { count: 0, users: [] },
                        favorite: { count: 0, users: [] }
                    });
                } else {
                    resolve(null);
                }
                unsubscribe();
            });
        });
    } catch (error) {
        console.error('통계 데이터 가져오기 오류:', error);
        return null;
    }
}