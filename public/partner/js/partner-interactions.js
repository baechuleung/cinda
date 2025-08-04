// 파일경로: /partner/js/partner-interactions.js
// 파일이름: partner-interactions.js

import { auth, db, rtdb } from '/js/firebase-config.js';
import { ref as rtdbRef, update, get, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
        const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
        const snapshot = await get(partnerRef);
        
        if (!snapshot.exists()) {
            console.error('제휴서비스가 존재하지 않습니다.');
            return false;
        }
        
        const partnerData = snapshot.val();
        const favoriteUsers = partnerData.statistics?.favorite?.users || [];
        const currentCount = partnerData.statistics?.favorite?.count || 0;
        
        const userIndex = favoriteUsers.indexOf(currentUser.uid);
        const isFavorited = userIndex > -1;
        
        if (isFavorited) {
            // 찜 취소
            favoriteUsers.splice(userIndex, 1);
            await update(partnerRef, {
                'statistics/favorite/count': currentCount - 1,
                'statistics/favorite/users': favoriteUsers
            });
            return false;
        } else {
            // 찜 추가
            favoriteUsers.push(currentUser.uid);
            await update(partnerRef, {
                'statistics/favorite/count': currentCount + 1,
                'statistics/favorite/users': favoriteUsers
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
    
    try {
        const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
        const snapshot = await get(partnerRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const favoriteUsers = data.statistics?.favorite?.users || [];
            return favoriteUsers.includes(currentUser.uid);
        }
        return false;
    } catch (error) {
        console.error('찜 상태 확인 오류:', error);
        return false;
    }
}

// 클릭 기록
export async function recordClick(partnerId, userId) {
    if (!currentUser) {
        console.log('로그인하지 않은 사용자의 클릭은 기록하지 않습니다.');
        return;
    }
    
    try {
        const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
        const snapshot = await get(partnerRef);
        
        if (!snapshot.exists()) {
            console.error('제휴서비스가 존재하지 않습니다.');
            return;
        }
        
        const partnerData = snapshot.val();
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
        currentStatistics.click.users.push(clickData);
        currentStatistics.click.count = currentStatistics.click.users.length;
        
        await update(partnerRef, {
            'statistics/click': currentStatistics.click
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
    
    const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
    
    const unsubscribe = onValue(partnerRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
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
        const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
        const snapshot = await get(partnerRef);
        
        if (!snapshot.exists()) {
            console.error('제휴서비스가 존재하지 않습니다.');
            return false;
        }
        
        const partnerData = snapshot.val();
        const recommendUsers = partnerData.statistics?.recommend?.users || [];
        const currentCount = partnerData.statistics?.recommend?.count || 0;
        
        const userIndex = recommendUsers.indexOf(currentUser.uid);
        const isRecommended = userIndex > -1;
        
        if (isRecommended) {
            // 추천 취소
            recommendUsers.splice(userIndex, 1);
            await update(partnerRef, {
                'statistics/recommend/count': currentCount - 1,
                'statistics/recommend/users': recommendUsers
            });
            return false;
        } else {
            // 추천 추가
            recommendUsers.push(currentUser.uid);
            await update(partnerRef, {
                'statistics/recommend/count': currentCount + 1,
                'statistics/recommend/users': recommendUsers
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
    
    try {
        const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
        const snapshot = await get(partnerRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const recommendUsers = data.statistics?.recommend?.users || [];
            return recommendUsers.includes(currentUser.uid);
        }
        return false;
    } catch (error) {
        console.error('추천 상태 확인 오류:', error);
        return false;
    }
}

// 추천 상태 실시간 감시
export function watchRecommendStatus(partnerId, userId, callback) {
    if (!currentUser) {
        callback(false);
        return () => {};
    }
    
    const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
    
    const unsubscribe = onValue(partnerRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
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
        const partnerRef = rtdbRef(rtdb, `ad_partner/${partnerId}`);
        const snapshot = await get(partnerRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            return data.statistics || {
                recommend: { count: 0, users: [] },
                click: { count: 0, users: [] },
                favorite: { count: 0, users: [] }
            };
        }
        return null;
    } catch (error) {
        console.error('통계 데이터 가져오기 오류:', error);
        return null;
    }
}