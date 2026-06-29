// 앱 초기화 및 탭 관리

let currentTab = 'calendar';

// 모바일 탭 전환
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tabBtn');
    const mobileCalendarTab = document.getElementById('mobileCalendarTab');
    const mobileTodoTab = document.getElementById('mobileTodoTab');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            currentTab = tab;

            // 버튼 스타일 업데이트
            tabButtons.forEach(b => {
                b.classList.remove('bg-indigo-600', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-indigo-600', 'text-white');

            // 탭 표시 업데이트 (모바일에서만)
            if (tab === 'calendar') {
                mobileCalendarTab.classList.remove('hidden');
                mobileTodoTab.classList.add('hidden');
            } else {
                mobileCalendarTab.classList.add('hidden');
                mobileTodoTab.classList.remove('hidden');
            }

            // 스크롤 위로
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    renderTodos(); // 초기 TODO 렌더링
    console.log('프로젝트 작업 캘린더 앱이 로드되었습니다.');
});

// 페이지 언로드 시 저장
window.addEventListener('beforeunload', () => {
    localStorage.setItem('todos', JSON.stringify(todos));
});
