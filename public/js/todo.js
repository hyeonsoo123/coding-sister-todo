// TODO 상태 관리 (개선된 버전)

let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';

// TODO 추가 함수
function addTodo(title, description = '', priority = 'medium') {
    if (!title.trim()) {
        alert('작업 제목을 입력하세요.');
        return;
    }

    const newTodo = {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        completed: false,
        date: selectedDate.toISOString().split('T')[0],
        createdAt: new Date().toLocaleString('ko-KR'),
        completedAt: null
    };

    todos.unshift(newTodo);
    saveTodos();
    renderTodos();

    // 입력 필드 비우기
    document.getElementById('todoInput').value = '';
    document.getElementById('todoDescription').value = '';
    document.getElementById('todoPriority').value = 'medium';
}

// TODO 제거 함수
function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
        renderCalendar(); // 캘린더 업데이트
    }
}

// TODO 완료 토글 함수
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        todo.completedAt = todo.completed ? new Date().toLocaleString('ko-KR') : null;
        saveTodos();
        renderTodos();
        renderCalendar(); // 캘린더 업데이트
    }
}

// 우선순위별 색상
function getPriorityColor(priority) {
    switch (priority) {
        case 'high':
            return 'bg-red-100 text-red-800 border-red-300';
        case 'medium':
            return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'low':
            return 'bg-green-100 text-green-800 border-green-300';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// 우선순위 표시
function getPriorityLabel(priority) {
    switch (priority) {
        case 'high':
            return '🔴 높음';
        case 'medium':
            return '🟡 중간';
        case 'low':
            return '🟢 낮음';
        default:
            return priority;
    }
}

// TODO 저장 함수
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// TODO 렌더링 함수
function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    // 선택한 날짜의 TODO만 필터링
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const todosForDate = todos.filter(todo => todo.date === selectedDateStr);

    // 추가 필터링 (전체/진행중/완료)
    const filteredTodos = todosForDate.filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        return true;
    });

    // 우선순위 정렬 (높음 > 중간 > 낮음)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredTodos.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1; // 완료 안 된 것이 위
        }
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<p class="text-center text-gray-500 py-8">이 날짜에 작업이 없습니다.</p>';
        return;
    }

    filteredTodos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = `p-4 rounded-lg border-2 transition ${
            todo.completed
                ? 'bg-gray-100 border-gray-300 opacity-60'
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
        }`;

        const priorityColorClass = getPriorityColor(todo.priority);

        todoItem.innerHTML = `
            <div class="flex items-start gap-3 mb-3">
                <input
                    type="checkbox"
                    data-todo-id="${todo.id}"
                    class="todoCheckbox w-5 h-5 text-indigo-600 rounded cursor-pointer mt-1 min-h-[44px] sm:min-h-5"
                    ${todo.completed ? 'checked' : ''}
                >
                <div class="flex-1 min-w-0">
                    <p class="text-lg font-semibold text-gray-800 ${todo.completed ? 'line-through text-gray-500' : ''} break-words">
                        ${todo.title}
                    </p>
                    ${todo.description ? `<p class="text-sm text-gray-600 mt-2 break-words">${todo.description}</p>` : ''}
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="px-3 py-1 rounded-full text-sm font-semibold border ${priorityColorClass}">
                    ${getPriorityLabel(todo.priority)}
                </span>
                <span class="text-xs text-gray-500">
                    생성: ${todo.createdAt}
                </span>
                ${todo.completedAt ? `<span class="text-xs text-green-600 font-semibold">완료: ${todo.completedAt}</span>` : ''}
            </div>

            <button
                class="todoDeleteBtn w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded transition font-semibold min-h-[44px] border border-red-200"
                data-todo-id="${todo.id}"
            >
                🗑️ 삭제
            </button>
        `;

        todoList.appendChild(todoItem);
    });

    // 통계 표시
    const stats = document.createElement('div');
    stats.className = 'mt-6 pt-4 border-t text-sm text-gray-600';
    const completedCount = filteredTodos.filter(t => t.completed).length;
    stats.innerHTML = `
        <p>완료: <strong>${completedCount}</strong> / 총: <strong>${filteredTodos.length}</strong></p>
    `;
    todoList.appendChild(stats);
}

// 이벤트 리스너 설정
function setupTodoListeners() {
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoInput = document.getElementById('todoInput');

    addTodoBtn.addEventListener('click', () => {
        const title = todoInput.value;
        const description = document.getElementById('todoDescription').value;
        const priority = document.getElementById('todoPriority').value;
        addTodo(title, description, priority);
    });

    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const title = todoInput.value;
            const description = document.getElementById('todoDescription').value;
            const priority = document.getElementById('todoPriority').value;
            addTodo(title, description, priority);
        }
    });

    // 필터 버튼 이벤트
    document.querySelectorAll('.filterBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filterBtn').forEach(b => {
                b.classList.remove('bg-indigo-600', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-indigo-600', 'text-white');

            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
}

// TODO 이벤트 위임
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('todoCheckbox')) {
        const todoId = parseInt(e.target.dataset.todoId);
        toggleTodo(todoId);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('todoDeleteBtn')) {
        const todoId = parseInt(e.target.dataset.todoId);
        deleteTodo(todoId);
    }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    setupTodoListeners();
});
