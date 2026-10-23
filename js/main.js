/**
 * 2026 부산대학교 교직원 직무연수 - 메인 페이지 컨트롤러 (main.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 상태 관리 객체
  const state = {
    allCourses: [],
    filteredCourses: [],
    filters: {
      search: '',
      category: '전체',
      requirement: '전체',
      method: '전체',
      target: '전체',
      department: '전체',
      sort: 'code-asc'
    },
    isLoading: true
  };

  // DOM 캐싱
  const dom = {
    coursesContainer: document.getElementById('coursesGrid'),
    resultsCount: document.getElementById('resultsCount'),
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    sortSelect: document.getElementById('sortSelect'),
    categoryTabsContainer: document.getElementById('categoryTabs'),
    filterRequirement: document.getElementById('filterRequirement'),
    filterMethod: document.getElementById('filterMethod'),
    filterTarget: document.getElementById('filterTarget'),
    filterDepartment: document.getElementById('filterDepartment'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    btnRefresh: document.getElementById('btnRefresh'),
    noticeMandatoryBtn: document.getElementById('noticeMandatoryBtn'),
    // Stats
    statTotal: document.getElementById('statTotal'),
    statMandatory: document.getElementById('statMandatory'),
    statAi: document.getElementById('statAi'),
    statDept: document.getElementById('statDept'),
    toastContainer: document.getElementById('toastContainer')
  };

  // 초기 실행
  init();

  async function init() {
    renderSkeletons();
    bindEvents();
    await loadData(false);
  }

  /**
   * 구글 시트 데이터 로드 및 UI 초기화
   */
  async function loadData(forceRefresh = false) {
    state.isLoading = true;
    if (forceRefresh && dom.btnRefresh) {
      dom.btnRefresh.classList.add('spinning');
    }

    try {
      const courses = await CourseAPI.fetchCourses(forceRefresh);
      state.allCourses = courses;
      state.isLoading = false;

      // 1. 헤더 통계 업데이트
      updateStatistics(courses);

      // 2. 부서 필터 셀렉트 동적 생성
      populateDepartmentFilter(courses);

      // 3. 카테고리 탭 렌더링 (카운트 포함)
      renderCategoryTabs(courses);

      // 4. 필터 및 렌더링 실행
      applyFilters();

      if (forceRefresh) {
        showToast('구글 시트의 최신 데이터를 동기화했습니다.');
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      state.isLoading = false;
      renderErrorState();
    } finally {
      if (dom.btnRefresh) {
        dom.btnRefresh.classList.remove('spinning');
      }
    }
  }

  /**
   * 이벤트 리스너 바인딩
   */
  function bindEvents() {
    // 실시간 검색 (디바운스 150ms)
    let searchTimeout;
    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const val = e.target.value.trim();
      dom.btnClearSearch.classList.toggle('visible', val.length > 0);
      searchTimeout = setTimeout(() => {
        state.filters.search = val;
        applyFilters();
      }, 150);
    });

    // 검색어 초기화 버튼
    dom.btnClearSearch.addEventListener('click', () => {
      dom.searchInput.value = '';
      dom.btnClearSearch.classList.remove('visible');
      state.filters.search = '';
      dom.searchInput.focus();
      applyFilters();
    });

    // 정렬 선택
    dom.sortSelect.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      applyFilters();
    });

    // 상세 필터 셀렉트 변경
    dom.filterRequirement.addEventListener('change', (e) => {
      state.filters.requirement = e.target.value;
      applyFilters();
    });

    dom.filterMethod.addEventListener('change', (e) => {
      state.filters.method = e.target.value;
      applyFilters();
    });

    dom.filterTarget.addEventListener('change', (e) => {
      state.filters.target = e.target.value;
      applyFilters();
    });

    dom.filterDepartment.addEventListener('change', (e) => {
      state.filters.department = e.target.value;
      applyFilters();
    });

    // 전체 필터 초기화 버튼
    dom.btnResetFilters.addEventListener('click', resetAllFilters);

    // 상단 새로고침 버튼 (실시간 동기화)
    dom.btnRefresh.addEventListener('click', () => {
      loadData(true);
    });

    // 법정의무교육 배너 바로가기 클릭
    if (dom.noticeMandatoryBtn) {
      dom.noticeMandatoryBtn.addEventListener('click', () => {
        resetAllFilters();
        setCategoryFilter('법정의무교육');
        // 부드러운 스크롤 이동
        document.getElementById('searchSection').scrollIntoView({ behavior: 'smooth' });
      });
    }

    // 스크롤 시 GNB 그림자 효과
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.site-header');
      if (header) {
        header.classList.toggle('scrolled', window.scrollY > 20);
      }
    });
  }

  /**
   * 상단 핵심 지표 카운터 갱신
   */
  function updateStatistics(courses) {
    const total = courses.length;
    const mandatory = courses.filter((c) => c.requirement === '필수' || c.category === '법정의무교육').length;
    const aiData = courses.filter((c) => c.category === '정보화·AI·데이터').length;
    const departments = new Set(courses.map((c) => c.department).filter(Boolean)).size;

    dom.statTotal.textContent = `${total}개`;
    dom.statMandatory.textContent = `${mandatory}개`;
    dom.statAi.textContent = `${aiData}개`;
    dom.statDept.textContent = `${departments}곳`;
  }

  /**
   * 주관부서 옵션 동적 채우기
   */
  function populateDepartmentFilter(courses) {
    const depts = Array.from(new Set(courses.map((c) => c.department).filter(Boolean))).sort();
    const currentVal = dom.filterDepartment.value;

    dom.filterDepartment.innerHTML = '<option value="전체">부서 전체</option>';
    depts.forEach((dept) => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      dom.filterDepartment.appendChild(opt);
    });

    if (depts.includes(currentVal)) {
      dom.filterDepartment.value = currentVal;
    }
  }

  /**
   * 카테고리 탭 렌더링
   */
  function renderCategoryTabs(courses) {
    dom.categoryTabsContainer.innerHTML = '';

    CONFIG.CATEGORIES.forEach((cat) => {
      const count = cat === '전체'
        ? courses.length
        : courses.filter((c) => c.category === cat).length;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `category-tab ${state.filters.category === cat ? 'active' : ''}`;
      btn.innerHTML = `<span>${cat}</span><span class="tab-count">${count}</span>`;
      btn.addEventListener('click', () => {
        setCategoryFilter(cat);
      });

      dom.categoryTabsContainer.appendChild(btn);
    });
  }

  function setCategoryFilter(category) {
    state.filters.category = category;
    document.querySelectorAll('.category-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.querySelector('span').textContent === category);
    });
    applyFilters();
  }

  /**
   * 필터 및 정렬 적용
   */
  function applyFilters() {
    const { search, category, requirement, method, target, department, sort } = state.filters;
    const query = search.toLowerCase();

    let result = state.allCourses.filter((course) => {
      // 1. 텍스트 검색
      if (query) {
        const matchText = (
          course.name +
          course.code +
          course.summary +
          course.department +
          course.category +
          course.target
        ).toLowerCase();
        if (!matchText.includes(query)) return false;
      }

      // 2. 분야 탭
      if (category !== '전체' && course.category !== category) return false;

      // 3. 이수구분
      if (requirement !== '전체' && course.requirement !== requirement) return false;

      // 4. 교육방식
      if (method !== '전체' && course.method !== method) return false;

      // 5. 교육대상
      if (target !== '전체' && course.target !== target) return false;

      // 6. 담당부서
      if (department !== '전체' && course.department !== department) return false;

      return true;
    });

    // 정렬
    result.sort((a, b) => {
      if (sort === 'code-asc') {
        return a.code.localeCompare(b.code);
      } else if (sort === 'name-asc') {
        return a.name.localeCompare(b.name, 'ko');
      } else if (sort === 'period-asc') {
        return a.period.localeCompare(b.period);
      }
      return 0;
    });

    state.filteredCourses = result;
    dom.resultsCount.innerHTML = `총 <strong>${result.length}</strong>개의 과정이 있습니다.`;

    renderCards(result);
  }

  /**
   * 연수 카드 렌더링
   */
  function renderCards(courses) {
    if (courses.length === 0) {
      renderEmptyState();
      return;
    }

    const fragment = document.createDocumentFragment();

    courses.forEach((c) => {
      const card = document.createElement('article');
      card.className = 'course-card';

      // 이수구분 배지 정보
      const reqInfo = CONFIG.REQUIREMENT_BADGES[c.requirement] || CONFIG.REQUIREMENT_BADGES['선택'];
      // 교육방식 아이콘 정보
      const methodInfo = CONFIG.METHOD_INFO[c.method] || { icon: 'book', label: c.method };

      card.innerHTML = `
        <div class="card-header">
          <div class="card-badges">
            <span class="badge ${reqInfo.className}">${reqInfo.label}</span>
            <span class="badge-method">
              <i data-lucide="${methodInfo.icon}"></i>
              ${methodInfo.label}
            </span>
          </div>
          <span class="card-code">${escapeHtml(c.code)}</span>
        </div>

        <div class="card-category">${escapeHtml(c.category)}</div>
        <h3 class="card-title" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h3>
        <p class="card-summary">${escapeHtml(c.summary || '상세 페이지에서 교육 일정 및 세부 커리큘럼을 확인하세요.')}</p>

        <div class="card-meta-list">
          <div class="card-meta-item">
            <i data-lucide="calendar"></i>
            <span>일정: <strong>${escapeHtml(c.period)}</strong></span>
          </div>
          <div class="card-meta-item">
            <i data-lucide="clock"></i>
            <span>시간/정원: <strong>${escapeHtml(c.hours)}</strong> / ${escapeHtml(c.capacity)}</span>
          </div>
          <div class="card-meta-item">
            <i data-lucide="user-check"></i>
            <span>대상: <strong>${escapeHtml(c.target)}</strong></span>
          </div>
        </div>

        <div class="card-footer">
          <span class="card-dept">${escapeHtml(c.department)}</span>
          <a href="detail.html?code=${encodeURIComponent(c.code)}" class="btn-card-detail">
            상세보기 <i data-lucide="chevron-right"></i>
          </a>
        </div>
      `;

      fragment.appendChild(card);
    });

    dom.coursesContainer.innerHTML = '';
    dom.coursesContainer.appendChild(fragment);

    // Lucide 아이콘 초기화
    if (window.lucide) {
      lucide.createIcons({
        attrs: {
          class: ['lucide-icon']
        }
      });
    }
  }

  /**
   * 스켈레톤 로딩 상태 표시
   */
  function renderSkeletons() {
    dom.coursesContainer.innerHTML = Array(6)
      .fill(0)
      .map(
        () => `
        <div class="skeleton-card">
          <div class="skeleton-box" style="width: 40%; height: 22px;"></div>
          <div class="skeleton-box" style="width: 85%; height: 28px; margin: 8px 0;"></div>
          <div class="skeleton-box" style="width: 100%; height: 40px;"></div>
          <div class="skeleton-box" style="width: 100%; height: 80px; margin-top: auto;"></div>
        </div>
      `
      )
      .join('');
  }

  /**
   * 검색 결과 없음 상태
   */
  function renderEmptyState() {
    dom.coursesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i data-lucide="search-x" style="width: 48px; height: 48px;"></i>
        </div>
        <h4 class="empty-title">일치하는 직무연수 과정이 없습니다</h4>
        <p class="empty-desc">검색어의 철자를 확인하거나 선택한 필터 조건을 변경해보세요.</p>
        <button type="button" class="btn-refresh" id="btnEmptyReset" style="margin: 0 auto;">
          <i data-lucide="rotate-ccw"></i> 필터 초기화
        </button>
      </div>
    `;

    document.getElementById('btnEmptyReset')?.addEventListener('click', resetAllFilters);

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 로드 에러 상태
   */
  function renderErrorState() {
    dom.coursesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="color: #dc2626;">
          <i data-lucide="alert-triangle" style="width: 48px; height: 48px;"></i>
        </div>
        <h4 class="empty-title">연수 데이터를 불러오지 못했습니다</h4>
        <p class="empty-desc">구글 시트 접근 상태 또는 네트워크 연결을 확인한 후 다시 시도해주세요.</p>
        <button type="button" class="btn-refresh" id="btnErrorRetry" style="margin: 0 auto;">
          <i data-lucide="rotate-cw"></i> 다시 시도
        </button>
      </div>
    `;

    document.getElementById('btnErrorRetry')?.addEventListener('click', () => loadData(true));

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 모든 필터 및 검색어 리셋
   */
  function resetAllFilters() {
    state.filters = {
      search: '',
      category: '전체',
      requirement: '전체',
      method: '전체',
      target: '전체',
      department: '전체',
      sort: 'code-asc'
    };

    dom.searchInput.value = '';
    dom.btnClearSearch.classList.remove('visible');
    dom.sortSelect.value = 'code-asc';
    dom.filterRequirement.value = '전체';
    dom.filterMethod.value = '전체';
    dom.filterTarget.value = '전체';
    dom.filterDepartment.value = '전체';

    document.querySelectorAll('.category-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.querySelector('span').textContent === '전체');
    });

    applyFilters();
  }

  /**
   * 토스트 메시지 표시
   */
  function showToast(message) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="check-circle" style="width: 16px; height: 16px; color: #34d399;"></i> <span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    if (window.lucide) {
      lucide.createIcons();
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
