// ============================================================
//  공용 UI 헬퍼 (홈/검색/찜/상세에서 공통 사용)
// ============================================================
const UI = (() => {
    // 포스터가 없을 때 쓰는 회색 플레이스홀더 (SVG data URI)
    const POSTER_FALLBACK =
        'data:image/svg+xml;charset=utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750">
                <rect width="100%" height="100%" fill="#e5e7eb"/>
                <text x="50%" y="50%" font-size="120" text-anchor="middle" dominant-baseline="middle">🎬</text>
            </svg>`
        );

    // 인물 프로필이 없을 때 쓰는 플레이스홀더 (👤)
    const PROFILE_FALLBACK =
        'data:image/svg+xml;charset=utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
                <rect width="100%" height="100%" fill="#e5e7eb"/>
                <text x="50%" y="52%" font-size="150" text-anchor="middle" dominant-baseline="middle">👤</text>
            </svg>`
        );

    function img(path, size = 'w500') {
        return path ? `${TMDB.IMG_URL}/${size}${path}` : POSTER_FALLBACK;
    }

    function profileImg(path, size = 'w185') {
        return path ? `${TMDB.IMG_URL}/${size}${path}` : PROFILE_FALLBACK;
    }

    function year(dateStr) {
        return dateStr ? dateStr.slice(0, 4) : I18N.t('tba');
    }

    function rating(value) {
        return value ? Number(value).toFixed(1) : '–';
    }

    // 사용자 입력/외부 문자열을 innerHTML에 넣기 전 이스케이프
    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // 영화/TV 겸용 포스터 카드 (링크 = 상세 페이지). 우상단 하트로 찜 토글.
    // item: TMDB movie/tv 객체. media_type가 없으면 title 유무로 추정.
    function mediaCard(item) {
        const type =
            item.media_type === 'tv' || item.media_type === 'movie'
                ? item.media_type
                : item.title
                ? 'movie'
                : 'tv';
        const title = item.title || item.name || '';
        const date = item.release_date || item.first_air_date || '';
        const href = type === 'tv' ? `tv-detail.html?id=${item.id}` : `movie-detail.html?id=${item.id}`;
        const norm = {
            id: item.id,
            media_type: type,
            title,
            poster_path: item.poster_path,
            vote_average: item.vote_average,
            release_date: date,
        };

        const card = document.createElement('a');
        card.href = href;
        card.className =
            'movie-card group relative block shrink-0 rounded-lg overflow-hidden shadow-md bg-gray-200';
        card.innerHTML = `
            <div class="relative aspect-[2/3] overflow-hidden">
                <img src="${img(item.poster_path)}" alt="${escapeHtml(title)}"
                     loading="lazy" class="fade-img card-img w-full h-full object-cover">
                ${type === 'tv' ? '<span class="type-badge">TV</span>' : ''}
                <button type="button" class="fav-btn" aria-label="favorite">
                    ${Favorites.has(item.id, type) ? '❤️' : '🤍'}
                </button>
                <div class="card-overlay">
                    <p class="card-title">${escapeHtml(title)}</p>
                    <p class="card-sub">⭐ ${rating(item.vote_average)} · ${year(date)}</p>
                </div>
            </div>
        `;

        const favBtn = card.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const added = Favorites.toggle(norm, type);
            favBtn.textContent = added ? '❤️' : '🤍';
            toast(added ? I18N.t('toast_added') : I18N.t('toast_removed'));
            document.dispatchEvent(new CustomEvent('favchange'));
        });

        return card;
    }

    // 하위 호환: 기존 movieCard 호출부는 그대로 동작
    const movieCard = mediaCard;

    // release_dates 응답에서 한국(KR) 관람등급 문자열 추출
    function certKR(releaseDates) {
        const kr = (releaseDates?.results || []).find((r) => r.iso_3166_1 === 'KR');
        if (!kr) return null;
        const found = (kr.release_dates || []).map((d) => d.certification).find((c) => c);
        return found || null;
    }

    // 관람등급 → 한글 라벨 + 색상 클래스
    function certLabel(cert) {
        if (!cert) return null;
        const c = String(cert).toUpperCase();
        if (c === 'ALL' || c === 'G') return { text: '전체', cls: 'bg-green-100 text-green-700' };
        if (c === '7') return { text: '7세', cls: 'bg-lime-100 text-lime-700' };
        if (c === '12') return { text: '12세', cls: 'bg-sky-100 text-sky-700' };
        if (c === '15') return { text: '15세', cls: 'bg-amber-100 text-amber-700' };
        if (c === '18' || c === '19' || c === 'R') return { text: '청불', cls: 'bg-red-100 text-red-700' };
        return { text: String(cert), cls: 'bg-gray-100 text-gray-700' };
    }

    // 하단 토스트 알림
    let toastTimer = null;
    function toast(message) {
        let el = document.getElementById('csToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'csToast';
            el.className =
                'fixed left-1/2 -translate-x-1/2 bottom-6 z-[100] px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-lg opacity-0 pointer-events-none transition-opacity duration-300';
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (el.style.opacity = '0'), 1800);
    }

    // 사용자가 "동작 줄이기"를 켰는지 (멀미 방지 — 관성/부드러운 스크롤 off)
    const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 마우스로 가로줄(.row-scroll)을 잡아끌어 스크롤 + 가벼운 관성.
    // 이벤트 위임이라 나중에 동적으로 추가된 줄에도 자동 적용됨. 터치는 네이티브 그대로.
    function enableDragScroll() {
        let el = null;
        let startX = 0;
        let startScroll = 0;
        let dragging = false;
        let moved = false;
        let velX = 0; // px/ms
        let lastX = 0;
        let lastT = 0;
        let raf = 0;

        document.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return; // 터치/우클릭 제외
            const target = e.target.closest('.row-scroll');
            if (!target) return;
            cancelAnimationFrame(raf);
            el = target;
            startX = e.clientX;
            startScroll = el.scrollLeft;
            dragging = true;
            moved = false;
            velX = 0;
            lastX = e.clientX;
            lastT = performance.now();
        });

        document.addEventListener('pointermove', (e) => {
            if (!dragging || !el) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 4) moved = true;
            el.scrollLeft = startScroll - dx;
            const now = performance.now();
            const dt = now - lastT;
            if (dt > 0) velX = (e.clientX - lastX) / dt;
            lastX = e.clientX;
            lastT = now;
            if (moved) {
                el.classList.add('dragging');
                e.preventDefault();
            }
        });

        function end() {
            if (!dragging) return;
            dragging = false;
            const dragged = moved;
            const scroller = el;
            if (scroller) scroller.classList.remove('dragging');
            // 드래그였다면 뒤이어 발생하는 카드 클릭(링크 이동) 1회 무시
            if (dragged && scroller) {
                const suppress = (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    scroller.removeEventListener('click', suppress, true);
                };
                scroller.addEventListener('click', suppress, true);
                setTimeout(() => scroller.removeEventListener('click', suppress, true), 50);
            }
            // 가벼운 관성: 프레임당 이동 상한(±40px) + 마찰 0.92로 확 튕기지 않게
            if (dragged && scroller && !reduced && Math.abs(velX) > 0.05) {
                let v = Math.max(-40, Math.min(40, velX * 16));
                const step = () => {
                    scroller.scrollLeft -= v;
                    v *= 0.92;
                    if (Math.abs(v) > 0.5) raf = requestAnimationFrame(step);
                };
                raf = requestAnimationFrame(step);
            }
            el = null;
        }

        document.addEventListener('pointerup', end);
        document.addEventListener('pointercancel', end);
    }

    // 이미지 페이드인: .fade-img 가 로드(또는 실패)되면 .loaded 부여 (팝 튐 방지)
    function enableImageFade() {
        const mark = (e) => {
            const t = e.target;
            if (t && t.tagName === 'IMG' && t.classList.contains('fade-img')) t.classList.add('loaded');
        };
        document.addEventListener('load', mark, true);
        document.addEventListener('error', mark, true);
    }

    // 맨 위로 ↑ 버튼 (스크롤 내려가면 등장)
    function createBackToTop() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', '맨 위로');
        btn.textContent = '↑';
        btn.className =
            'fixed bottom-6 right-6 z-[90] w-12 h-12 rounded-full bg-indigo-600 text-white text-xl font-bold shadow-lg opacity-0 pointer-events-none transition-opacity duration-300 hover:bg-indigo-700';
        btn.addEventListener('click', () =>
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
        );
        document.body.appendChild(btn);
        const onScroll = () => {
            const show = window.scrollY > 400;
            btn.style.opacity = show ? '1' : '0';
            btn.style.pointerEvents = show ? 'auto' : 'none';
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // 예고편: 썸네일 + ▶ 버튼 → 클릭 시에만 유튜브 iframe 로드 (상세 열 때마다 안 무겁게)
    function trailerBlock(key) {
        const thumb = `https://img.youtube.com/vi/${key}/hqdefault.jpg`;
        return `
            <div class="trailer-embed relative w-full rounded-xl overflow-hidden shadow-lg cursor-pointer" style="aspect-ratio:16/9;" data-key="${key}">
                <img src="${thumb}" alt="예고편 썸네일" class="w-full h-full object-cover">
                <button type="button" class="trailer-play absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition" aria-label="예고편 재생">
                    <span class="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl shadow-lg">▶</span>
                </button>
            </div>`;
    }
    function enableTrailerPlay() {
        document.addEventListener('click', (e) => {
            const play = e.target.closest('.trailer-play');
            if (!play) return;
            const box = play.closest('.trailer-embed');
            const key = box && box.dataset.key;
            if (!key) return;
            box.innerHTML = `<iframe class="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/${key}?autoplay=1" title="예고편"
                frameborder="0" allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
        });
    }

    // 예고편 전체화면 모달 재생 (히어로 등에서 유튜브 key로 호출)
    function playTrailer(key) {
        let modal = document.getElementById('csTrailerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'csTrailerModal';
            modal.className = 'fixed inset-0 z-[110] bg-black/85 flex items-center justify-center p-4 hidden';
            modal.innerHTML = `
                <div class="relative w-full max-w-4xl">
                    <button type="button" id="csTrailerClose" aria-label="close" class="absolute -top-10 right-0 text-white text-3xl leading-none hover:text-gray-300">✕</button>
                    <div class="relative w-full rounded-xl overflow-hidden shadow-2xl bg-black" style="aspect-ratio:16/9;">
                        <iframe id="csTrailerFrame" class="absolute inset-0 w-full h-full" src="" title="trailer"
                            frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            const close = () => {
                modal.classList.add('hidden');
                document.getElementById('csTrailerFrame').src = '';
            };
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });
            document.getElementById('csTrailerClose').addEventListener('click', close);
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') close();
            });
        }
        modal.classList.remove('hidden');
        document.getElementById('csTrailerFrame').src = `https://www.youtube.com/embed/${key}?autoplay=1`;
    }

    // 모바일 헤더 햄버거 메뉴 토글 (없는 페이지에선 no-op)
    function initHeaderMenu() {
        const btn = document.getElementById('menuBtn');
        const panel = document.getElementById('menuPanel');
        if (!btn || !panel) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== btn) {
                panel.classList.add('hidden');
            }
        });
    }

    enableDragScroll();
    enableImageFade();
    enableTrailerPlay();
    createBackToTop();
    initHeaderMenu();

    return { img, profileImg, year, rating, escapeHtml, mediaCard, movieCard, toast, trailerBlock, playTrailer, certKR, certLabel, POSTER_FALLBACK };
})();
