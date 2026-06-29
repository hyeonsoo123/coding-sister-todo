// 캘린더 기능

let currentDate = new Date();
let selectedDate = new Date();

function renderCalendar() {
    const calendarMobile = document.getElementById('calendar');
    const calendarDesktop = document.getElementById('calendarDesktop');

    // 모바일과 데스크톱 둘 다 같은 내용으로 렌더링
    [calendarMobile, calendarDesktop].forEach(calendarDiv => {
        if (!calendarDiv) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 헤더 (월/연도 및 네비게이션)
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-3 gap-2';
        header.innerHTML = `
            <button class="prevMonth px-2 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold flex items-center justify-center flex-shrink-0">
                ◀
            </button>
            <h3 class="text-base sm:text-lg font-bold text-gray-800 text-center flex-1">
                ${year}년 ${month + 1}월
            </h3>
            <button class="nextMonth px-2 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold flex items-center justify-center flex-shrink-0">
                ▶
            </button>
        `;

        // 요일 표시
        const daysHeader = document.createElement('div');
        daysHeader.className = 'grid grid-cols-7 gap-0.5 mb-2';
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayNames.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'text-center font-semibold text-gray-600 py-1 text-xs sm:text-sm';
            dayDiv.textContent = day;
            daysHeader.appendChild(dayDiv);
        });

        // 날짜 생성
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const daysGrid = document.createElement('div');
        daysGrid.className = 'grid grid-cols-7 gap-0.5';

        // 이전 달의 날짜들 (회색)
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayDiv = document.createElement('button');
            dayDiv.className = 'aspect-square p-0 text-center text-gray-400 text-xs sm:text-sm rounded';
            dayDiv.textContent = daysInPrevMonth - i;
            dayDiv.disabled = true;
            daysGrid.appendChild(dayDiv);
        }

        // 현재 달의 날짜들
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('button');
            const dateObj = new Date(year, month, day);
            const isToday = isDateToday(dateObj);
            const isSelected = isDateEqual(dateObj, selectedDate);
            const hasTodos = hasTodosOnDate(dateObj);

            let classes = 'aspect-square p-0 text-center text-xs sm:text-sm font-semibold rounded transition';

            if (isSelected) {
                classes += ' bg-indigo-600 text-white ring-2 ring-indigo-400';
            } else if (isToday) {
                classes += ' bg-blue-100 text-indigo-600 border-2 border-indigo-600';
            } else {
                classes += ' bg-gray-100 text-gray-800 hover:bg-gray-200';
            }

            if (hasTodos && !isSelected) {
                classes += ' font-bold';
            }

            dayDiv.className = classes;
            dayDiv.textContent = day;

            dayDiv.addEventListener('click', () => {
                selectedDate = dateObj;
                updateSelectedDate();
                renderCalendar();
                renderTodos();
            });

            daysGrid.appendChild(dayDiv);
        }

        // 다음 달의 날짜들 (회색)
        const totalCells = daysGrid.children.length;
        const remainingCells = 42 - totalCells; // 6주 * 7일
        for (let day = 1; day <= remainingCells; day++) {
            const dayDiv = document.createElement('button');
            dayDiv.className = 'aspect-square p-0 text-center text-gray-400 text-xs sm:text-sm rounded';
            dayDiv.textContent = day;
            dayDiv.disabled = true;
            daysGrid.appendChild(dayDiv);
        }

        // 캘린더 렌더링
        calendarDiv.innerHTML = '';
        calendarDiv.appendChild(header);
        calendarDiv.appendChild(daysHeader);
        calendarDiv.appendChild(daysGrid);
    });

}

function isDateToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function isDateEqual(date1, date2) {
    return date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear();
}

function hasTodosOnDate(date) {
    return todos.some(todo => isDateEqual(new Date(todo.date), date));
}

function updateSelectedDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateStr = selectedDate.toLocaleDateString('ko-KR', options);
    document.getElementById('selectedDate').textContent = `${dateStr} 작업`;
}

// 네비게이션 이벤트 위임 (한 번만 등록)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('prevMonth')) {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    } else if (e.target.classList.contains('nextMonth')) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    }
});

// 페이지 로드 시 캘린더 렌더링
document.addEventListener('DOMContentLoaded', () => {
    updateSelectedDate();
    renderCalendar();
});
