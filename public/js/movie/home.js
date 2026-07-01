// ============================================================
//  index.html (영화 홈) 컨트롤러
//  - 홈: 인기/현재상영/개봉예정/트렌드/평점 + 장르별 가로 슬라이드
//  - 탐색: 전체 장르 + 정렬/평점/연도 필터 + 더보기
//  - 검색: 제목 검색 + 더보기(페이지네이션)
//  - 내 찜: localStorage 목록
// ============================================================
(() => {
    // 홈 가로 슬라이드 구성
    const T = I18N.t;
    const ROWS = [
        { title: '🔥 ' + T('row_popular'), load: () => TMDBApi.popular() },
        { title: '🎬 ' + T('row_now'), load: () => TMDBApi.nowPlaying() },
        { title: '🗓 ' + T('row_upcoming'), load: () => TMDBApi.upcoming() },
        { title: '📈 ' + T('row_trend'), load: () => TMDBApi.trending() },
        { title: '⭐ ' + T('row_top'), load: () => TMDBApi.topRated() },
        { title: '💥 ' + T('row_action'), load: () => TMDBApi.byGenre(28) },
        { title: '😂 ' + T('row_comedy'), load: () => TMDBApi.byGenre(35) },
        { title: '👻 ' + T('row_horror'), load: () => TMDBApi.byGenre(27) },
        { title: '🎈 ' + T('row_anim'), load: () => TMDBApi.byGenre(16) },
    ];

    // TV/시리즈 탭 가로 슬라이드 구성 (TV 전용 장르 ID)
    const TV_ROWS = [
        { title: '🔥 ' + T('tv_popular'), load: () => TMDBApi.tvPopular() },
        { title: '📡 ' + T('tv_onair'), load: () => TMDBApi.tvOnTheAir() },
        { title: '📈 ' + T('tv_trend'), load: () => TMDBApi.tvTrending() },
        { title: '⭐ ' + T('tv_top'), load: () => TMDBApi.tvTopRated() },
        { title: '🎭 ' + T('tv_drama'), load: () => TMDBApi.tvByGenre(18) },
        { title: '😂 ' + T('row_comedy'), load: () => TMDBApi.tvByGenre(35) },
        { title: '💥 ' + T('tv_action_adv'), load: () => TMDBApi.tvByGenre(10759) },
        { title: '🚀 ' + T('tv_scifi'), load: () => TMDBApi.tvByGenre(10765) },
        { title: '🎈 ' + T('row_anim'), load: () => TMDBApi.tvByGenre(16) },
    ];

    const views = {
        home: document.getElementById('homeView'),
        tv: document.getElementById('tvView'),
        browse: document.getElementById('browseView'),
        search: document.getElementById('searchView'),
        fav: document.getElementById('favView'),
    };
    const navButtons = document.querySelectorAll('[data-view]');
    const favCountEl = document.getElementById('favCount');
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const searchMoreBtn = document.getElementById('searchMore');
    const browseMoreBtn = document.getElementById('browseMore');

    const state = {
        tv: { loaded: false },
        search: { query: '', page: 1, totalPages: 1, loading: false },
        browse: {
            loading: false,
            genres: new Set(),
            sort: 'popularity.desc',
            minRating: '',
            year: '',
            page: 1,
            totalPages: 1,
            loaded: false,
        },
    };

    // ---------- 공용 ----------
    function appendMovies(container, results) {
        (results || [])
            .filter((m) => m.poster_path)
            .forEach((m) => container.appendChild(UI.movieCard(m)));
    }

    function skeletonCards(n) {
        return Array.from({ length: n })
            .map(() => `<div class="shrink-0 w-36 sm:w-44 aspect-[2/3] rounded-lg bg-gray-200 animate-pulse"></div>`)
            .join('');
    }
    function skeletonGrid(n) {
        return Array.from({ length: n })
            .map(() => `<div class="aspect-[2/3] rounded-lg bg-gray-200 animate-pulse"></div>`)
            .join('');
    }
    function emptyState(emoji, title, desc) {
        return `
            <div class="col-span-full text-center py-16">
                <div class="text-6xl mb-4">${emoji}</div>
                <p class="text-lg font-bold text-gray-700">${title}</p>
                <p class="text-gray-500 mt-1">${desc}</p>
            </div>`;
    }

    // ---------- 뷰 전환 ----------
    function showView(name) {
        Object.entries(views).forEach(([key, el]) => el.classList.toggle('hidden', key !== name));
        navButtons.forEach((btn) => {
            const active = btn.dataset.view === name;
            btn.classList.toggle('bg-indigo-600', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('text-indigo-600', !active);
            btn.classList.toggle('bg-indigo-100', !active);
        });
        if (name === 'fav') renderFavorites();
        if (name === 'tv' && !state.tv.loaded) loadTv();
        if (name === 'browse' && !state.browse.loaded) initBrowse();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ---------- 홈: 가로 슬라이드 ----------
    function createRow({ title }) {
        const section = document.createElement('section');
        section.className = 'mb-8';
        section.innerHTML = `
            <h3 class="text-xl sm:text-2xl font-bold text-gray-800 mb-3 px-1">${title}</h3>
            <div class="relative group/row">
                <button type="button" class="row-arrow left" aria-label="왼쪽">‹</button>
                <div class="row-scroll flex gap-3 overflow-x-auto pb-2"></div>
                <button type="button" class="row-arrow right" aria-label="오른쪽">›</button>
            </div>
        `;
        const scroll = section.querySelector('.row-scroll');
        section.querySelector('.row-arrow.left').addEventListener('click', () =>
            scroll.scrollBy({ left: -scroll.clientWidth * 0.9, behavior: 'smooth' })
        );
        section.querySelector('.row-arrow.right').addEventListener('click', () =>
            scroll.scrollBy({ left: scroll.clientWidth * 0.9, behavior: 'smooth' })
        );
        return { section, scroll };
    }

    async function loadRow(rowConfig, container) {
        const { section, scroll } = createRow(rowConfig);
        container.appendChild(section);
        scroll.innerHTML = skeletonCards(6);
        try {
            const data = await rowConfig.load();
            scroll.innerHTML = '';
            const movies = (data.results || []).filter((m) => m.poster_path);
            if (!movies.length) {
                section.remove(); // 빈 줄은 아예 숨김 (추천/최근 등이 비면 깔끔하게)
                return;
            }
            movies.forEach((m) => scroll.appendChild(UI.movieCard(m)));
        } catch (err) {
            scroll.innerHTML = `<p class="text-red-500 text-sm py-8">${T('load_fail')}: ${UI.escapeHtml(err.message)}</p>`;
        }
    }

    // 고정 배열로 가로 줄 만들기 (최근 본 작품처럼 이미 가진 데이터용)
    function staticRow(title, items, container) {
        const { section, scroll } = createRow({ title });
        container.appendChild(section);
        items.filter((m) => m.poster_path).forEach((m) => scroll.appendChild(UI.mediaCard(m)));
    }

    function loadHome() {
        const container = document.getElementById('rows');
        container.innerHTML = '';
        // 개인화 줄 (최상단, 있을 때만)
        const recent = Recent.all();
        if (recent.length) staticRow('🕘 ' + T('row_recent'), recent, container);
        const favs = Favorites.all();
        if (favs.length) {
            const f = favs[0]; // 가장 최근에 찜한 작품 기반 추천
            loadRow(
                {
                    title: '❤️ ' + T('row_because', { title: f.title }),
                    load: () => TMDBApi.recommendations(f.media_type || 'movie', f.id),
                },
                container
            );
        }
        ROWS.forEach((row) => loadRow(row, container)); // 각 줄 병렬 로드
    }

    function loadTv() {
        state.tv.loaded = true;
        const container = document.getElementById('tvRows');
        container.innerHTML = '';
        TV_ROWS.forEach((row) => loadRow(row, container));
    }

    // ---------- 검색 (더보기 지원) ----------
    async function runSearch(reset) {
        const grid = document.getElementById('searchResults');
        const heading = document.getElementById('searchHeading');
        if (reset) {
            const q = searchInput.value.trim();
            if (!q) return;
            state.search = { query: q, page: 1, totalPages: 1, loading: false };
            showView('search');
            grid.innerHTML = skeletonGrid(12);
            heading.textContent = T('search_searching', { q });
            searchMoreBtn.classList.add('hidden');
        }
        const s = state.search;
        try {
            const data = await TMDBApi.searchMulti(s.query, s.page);
            s.totalPages = data.total_pages || 1;
            if (reset) grid.innerHTML = '';
            // 통합 검색: 영화/TV만 (인물 제외), 포스터 있는 것
            const items = (data.results || []).filter(
                (m) => (m.media_type === 'movie' || m.media_type === 'tv') && m.poster_path
            );
            if (reset && !items.length) {
                grid.innerHTML = emptyState('🔍', T('empty_search_t'), T('empty_search_d'));
            } else {
                items.forEach((m) => grid.appendChild(UI.mediaCard(m)));
            }
            if (reset) {
                heading.textContent = T('search_results', {
                    q: s.query,
                    n: (data.total_results || items.length).toLocaleString(),
                });
            }
            searchMoreBtn.classList.toggle('hidden', s.page >= s.totalPages);
        } catch (err) {
            if (reset) {
                heading.textContent = T('search_fail');
                grid.innerHTML = `<p class="text-red-500 col-span-full">${UI.escapeHtml(err.message)}</p>`;
            } else {
                UI.toast(`${T('toast_more_fail')}: ${err.message}`);
            }
        }
    }

    // ---------- 탐색 (전체 장르 + 필터 + 더보기) ----------
    async function initBrowse() {
        state.browse.loaded = true;
        const chips = document.getElementById('genreChips');
        try {
            const data = await TMDBApi.genres();
            chips.innerHTML = '';
            (data.genres || []).forEach((g) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.genreId = g.id;
                btn.textContent = g.name;
                btn.className =
                    'genre-chip px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition min-h-[40px]';
                btn.addEventListener('click', () => {
                    const id = g.id;
                    if (state.browse.genres.has(id)) {
                        state.browse.genres.delete(id);
                        btn.classList.remove('bg-indigo-600', 'text-white');
                        btn.classList.add('bg-gray-100', 'text-gray-600');
                    } else {
                        state.browse.genres.add(id);
                        btn.classList.add('bg-indigo-600', 'text-white');
                        btn.classList.remove('bg-gray-100', 'text-gray-600');
                    }
                });
                chips.appendChild(btn);
            });
        } catch (err) {
            chips.innerHTML = `<span class="text-red-500 text-sm">${T('genre_fail')}: ${UI.escapeHtml(err.message)}</span>`;
        }

        // 필터 컨트롤 이벤트
        document.getElementById('applyFilter').addEventListener('click', () => {
            state.browse.sort = document.getElementById('sortBy').value;
            state.browse.minRating = document.getElementById('minRating').value;
            state.browse.year = document.getElementById('yearFilter').value;
            runBrowse(true);
        });
        document.getElementById('resetFilter').addEventListener('click', () => {
            state.browse.genres.clear();
            document.querySelectorAll('.genre-chip').forEach((c) => {
                c.classList.remove('bg-indigo-600', 'text-white');
                c.classList.add('bg-gray-100', 'text-gray-600');
            });
            document.getElementById('sortBy').value = 'popularity.desc';
            document.getElementById('minRating').value = '';
            document.getElementById('yearFilter').value = '';
            Object.assign(state.browse, { sort: 'popularity.desc', minRating: '', year: '' });
            runBrowse(true);
        });

        runBrowse(true); // 기본(인기순) 결과 먼저 보여주기
    }

    function browseParams() {
        const b = state.browse;
        const params = { sort_by: b.sort, page: b.page };
        if (b.genres.size) params.with_genres = [...b.genres].join(',');
        if (b.minRating) params['vote_average.gte'] = b.minRating;
        if (b.year) params.primary_release_year = b.year;
        // 평점순 정렬 시 표본 적은 영화가 상위를 독식하지 않도록 최소 투표수 제한
        if (b.sort === 'vote_average.desc') params['vote_count.gte'] = 200;
        return params;
    }

    async function runBrowse(reset) {
        const grid = document.getElementById('browseResults');
        const moreBtn = document.getElementById('browseMore');
        if (reset) {
            state.browse.page = 1;
            grid.innerHTML = skeletonGrid(12);
            moreBtn.classList.add('hidden');
        }
        try {
            const data = await TMDBApi.discover(browseParams());
            state.browse.totalPages = data.total_pages || 1;
            if (reset) grid.innerHTML = '';
            const movies = (data.results || []).filter((m) => m.poster_path);
            if (reset && !movies.length) {
                grid.innerHTML = emptyState('🎬', T('empty_browse_t'), T('empty_browse_d'));
            } else {
                movies.forEach((m) => grid.appendChild(UI.movieCard(m)));
            }
            moreBtn.classList.toggle('hidden', state.browse.page >= state.browse.totalPages);
        } catch (err) {
            if (reset) {
                grid.innerHTML = `<p class="text-red-500 col-span-full">${UI.escapeHtml(err.message)}</p>`;
            } else {
                UI.toast(`${T('toast_more_fail')}: ${err.message}`);
            }
        }
    }

    // ---------- 무한 스크롤 (검색·탐색) ----------
    function loadMoreSearch() {
        const s = state.search;
        if (s.loading || s.page >= s.totalPages) return;
        s.loading = true;
        s.page += 1;
        Promise.resolve(runSearch(false)).finally(() => (s.loading = false));
    }
    function loadMoreBrowse() {
        const b = state.browse;
        if (b.loading || b.page >= b.totalPages) return;
        b.loading = true;
        b.page += 1;
        Promise.resolve(runBrowse(false)).finally(() => (b.loading = false));
    }

    // ---------- 내 찜 ----------
    function renderFavorites() {
        const grid = document.getElementById('favGrid');
        const list = Favorites.all();
        grid.innerHTML = '';
        if (!list.length) {
            grid.innerHTML = emptyState('🤍', T('empty_fav_t'), T('empty_fav_d'));
            return;
        }
        list.forEach((m) => grid.appendChild(UI.movieCard(m)));
    }

    function updateFavCount() {
        const n = Favorites.count();
        favCountEl.textContent = n;
        favCountEl.classList.toggle('hidden', n === 0);
    }

    // ---------- 히어로 빌보드 (트렌딩 5개, 수동 넘김) ----------
    let heroItems = [];
    let heroIdx = 0;

    async function initHero() {
        const hero = document.getElementById('hero');
        try {
            const data = await TMDBApi.trending();
            heroItems = (data.results || []).filter((m) => m.backdrop_path && m.overview).slice(0, 5);
            if (!heroItems.length) {
                hero.classList.add('hidden');
                return;
            }
            buildHeroDots();
            renderHero(0);
            document.getElementById('heroPrev').addEventListener('click', () => renderHero(heroIdx - 1));
            document.getElementById('heroNext').addEventListener('click', () => renderHero(heroIdx + 1));
            document.getElementById('heroFav').addEventListener('click', () => {
                const m = heroItems[heroIdx];
                const added = Favorites.toggle(m, 'movie');
                updateHeroFav();
                UI.toast(added ? T('toast_added') : T('toast_removed'));
                document.dispatchEvent(new CustomEvent('favchange'));
            });
            document.getElementById('heroTrailer').addEventListener('click', playHeroTrailer);
            setupHeroSwipe();
        } catch {
            hero.classList.add('hidden');
        }
    }

    // 히어로 스와이프/드래그 — 손 따라 실시간으로 밀리고, 놓으면 복귀/넘김
    // (검색·버튼·점 위에서 시작하면 무시. 배경 이동은 저항 0.4로 살짝만)
    function setupHeroSwipe() {
        const hero = document.getElementById('hero');
        const slide = document.getElementById('heroSlide');
        const info = document.getElementById('heroInfo');
        const RESIST = 0.4;
        let startX = null;
        let dx = 0;

        const shift = (px) => {
            slide.style.transform = `translateX(${px}px)`;
            info.style.transform = `translateX(${px}px)`;
        };

        hero.addEventListener('pointerdown', (e) => {
            if (e.target.closest('input, button, a, #heroDots')) return;
            startX = e.clientX;
            dx = 0;
            slide.style.transition = 'none';
            info.style.transition = 'none';
        });
        hero.addEventListener('pointermove', (e) => {
            if (startX === null) return;
            dx = e.clientX - startX;
            shift(dx * RESIST); // 드래그하는 즉시 배너가 따라 이동 (라이브 피드백)
        });
        const end = () => {
            if (startX === null) return;
            const moved = dx;
            startX = null;
            slide.style.transition = 'transform 0.3s ease';
            info.style.transition = 'transform 0.3s ease';
            shift(0); // 원위치로 스르륵 복귀
            if (Math.abs(moved) > 60) renderHero(heroIdx + (moved < 0 ? 1 : -1));
        };
        hero.addEventListener('pointerup', end);
        hero.addEventListener('pointercancel', end);
    }

    function pickYouTubeKey(data) {
        const list = (data.results || []).filter((v) => v.site === 'YouTube');
        const v =
            list.find((x) => x.type === 'Trailer' && x.official) ||
            list.find((x) => x.type === 'Trailer') ||
            list.find((x) => x.type === 'Teaser') ||
            list[0];
        return v ? v.key : null;
    }

    async function playHeroTrailer() {
        const m = heroItems[heroIdx];
        if (!m) return;
        try {
            let key = pickYouTubeKey(await TMDBApi.movieVideos(m.id));
            if (!key) key = pickYouTubeKey(await TMDBApi.get(`/movie/${m.id}/videos`, { language: 'en-US' }));
            if (key) UI.playTrailer(key);
            else UI.toast(T('no_trailer'));
        } catch {
            UI.toast(T('no_trailer'));
        }
    }

    function buildHeroDots() {
        const dots = document.getElementById('heroDots');
        dots.innerHTML = heroItems
            .map((_, i) => `<button type="button" data-idx="${i}" aria-label="${i + 1}" class="hero-dot w-2.5 h-2.5 rounded-full bg-white/50 transition"></button>`)
            .join('');
        dots.querySelectorAll('.hero-dot').forEach((d) =>
            d.addEventListener('click', () => renderHero(Number(d.dataset.idx)))
        );
    }

    function updateHeroFav() {
        const m = heroItems[heroIdx];
        const btn = document.getElementById('heroFav');
        if (btn && m) btn.textContent = Favorites.has(m.id, 'movie') ? '❤️' : '🤍';
    }

    function renderHero(i) {
        heroIdx = (i + heroItems.length) % heroItems.length;
        const m = heroItems[heroIdx];
        const img = document.getElementById('heroImg');
        img.style.opacity = '0';
        const next = new Image();
        next.onload = () => {
            img.src = next.src;
            img.style.opacity = '1';
        };
        next.src = UI.img(m.backdrop_path, 'w1280');
        document.getElementById('heroTitle').textContent = m.title || m.name;
        document.getElementById('heroTitleLink').href = `movie-detail.html?id=${m.id}`;
        document.getElementById('heroDetail').href = `movie-detail.html?id=${m.id}`;
        document.getElementById('heroOverview').textContent = m.overview || '';
        document.getElementById('heroMeta').innerHTML =
            `<span class="font-bold text-yellow-400">⭐ ${UI.rating(m.vote_average)}</span>` +
            `<span class="text-gray-300">·</span>` +
            `<span class="text-gray-200">${UI.year(m.release_date)}</span>`;
        updateHeroFav();
        document.querySelectorAll('.hero-dot').forEach((d, idx) => {
            d.classList.toggle('bg-white', idx === heroIdx);
            d.classList.toggle('bg-white/50', idx !== heroIdx);
        });
    }

    // ---------- 초기화 ----------
    function init() {
        navButtons.forEach((btn) => btn.addEventListener('click', () => showView(btn.dataset.view)));
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            runSearch(true);
        });
        // 더보기 버튼(수동) + 무한 스크롤(자동): 버튼이 뷰포트 근처 오면 자동 로드
        searchMoreBtn.addEventListener('click', loadMoreSearch);
        browseMoreBtn.addEventListener('click', loadMoreBrowse);
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    if (e.target === searchMoreBtn) loadMoreSearch();
                    else if (e.target === browseMoreBtn) loadMoreBrowse();
                });
            },
            { rootMargin: '600px' }
        );
        io.observe(searchMoreBtn);
        io.observe(browseMoreBtn);
        document.addEventListener('favchange', () => {
            updateFavCount();
            updateHeroFav();
            if (!views.fav.classList.contains('hidden')) renderFavorites();
        });

        updateFavCount();
        initHero();
        loadHome();
        showView('home');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
