/**
 * 2026 부산대학교 교직원 직무연수 - 상세 페이지 컨트롤러 (detail.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const courseCode = params.get('code');

  const dom = {
    loadingState: document.getElementById('detailLoading'),
    contentSection: document.getElementById('detailContent'),
    notFoundSection: document.getElementById('detailNotFound'),
    toastContainer: document.getElementById('toastContainer'),
    btnRefresh: document.getElementById('btnRefresh'),

    // Breadcrumb
    breadcrumbCategory: document.getElementById('breadcrumbCategory'),
    breadcrumbCode: document.getElementById('breadcrumbCode'),

    // Header Card
    detailCategoryTag: document.getElementById('detailCategoryTag'),
    detailReqBadge: document.getElementById('detailReqBadge'),
    detailMethodBadge: document.getElementById('detailMethodBadge'),
    detailCode: document.getElementById('detailCode'),
    detailTitle: document.getElementById('detailTitle'),
    detailSummary: document.getElementById('detailSummary'),

    // Bento Grid Values
    bentoPeriod: document.getElementById('bentoPeriod'),
    bentoApplyPeriod: document.getElementById('bentoApplyPeriod'),
    bentoMethodHours: document.getElementById('bentoMethodHours'),
    bentoCapacity: document.getElementById('bentoCapacity'),
    bentoTarget: document.getElementById('bentoTarget'),
    bentoDeptContact: document.getElementById('bentoDeptContact'),

    // Content Blocks
    descBody: document.getElementById('descBody'),
    objectivesList: document.getElementById('objectivesList'),
    curriculumGrid: document.getElementById('curriculumGrid'),

    // Action Bar
    btnApply: document.getElementById('btnApply'),
    btnCall: document.getElementById('btnCall'),
    btnShare: document.getElementById('btnShare'),

    // Related Courses
    relatedCoursesGrid: document.getElementById('relatedCoursesGrid'),
    relatedCategoryName: document.getElementById('relatedCategoryName')
  };

  init();

  async function init() {
    bindEvents();
    if (!courseCode) {
      showNotFound();
      return;
    }
    await loadCourseDetail(false);
  }

  function bindEvents() {
    // 실시간 새로고침
    dom.btnRefresh?.addEventListener('click', async () => {
      dom.btnRefresh.classList.add('spinning');
      await loadCourseDetail(true);
      dom.btnRefresh.classList.remove('spinning');
      showToast('구글 시트의 최신 데이터를 동기화했습니다.');
    });

    // 공유하기 (URL 복사)
    dom.btnShare?.addEventListener('click', copyPageUrl);
  }

  async function loadCourseDetail(forceRefresh = false) {
    dom.loadingState.style.display = 'block';
    dom.contentSection.style.display = 'none';
    dom.notFoundSection.style.display = 'none';

    try {
      const allCourses = await CourseAPI.fetchCourses(forceRefresh);
      const course = allCourses.find((c) => c.code.toLowerCase() === courseCode.toLowerCase());

      if (!course) {
        showNotFound();
        return;
      }

      renderCourse(course, allCourses);
    } catch (err) {
      console.error('상세 정보 로드 실패:', err);
      showNotFound('데이터를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
    } finally {
      dom.loadingState.style.display = 'none';
    }
  }

  function renderCourse(course, allCourses) {
    // 1. 브라우저 탭 타이틀 변경
    document.title = `${course.name} - 2026 부산대학교 직무연수`;

    // 2. 브레드크럼
    dom.breadcrumbCategory.textContent = course.category;
    dom.breadcrumbCode.textContent = course.code;

    // 3. 상단 헤더
    dom.detailCategoryTag.textContent = course.category;
    dom.detailCode.textContent = course.code;
    dom.detailTitle.textContent = course.name;
    dom.detailSummary.textContent = course.summary || '교육 세부 내용은 아래 상세 항목을 참고하시기 바랍니다.';

    // 이수구분 배지
    const reqInfo = CONFIG.REQUIREMENT_BADGES[course.requirement] || CONFIG.REQUIREMENT_BADGES['선택'];
    dom.detailReqBadge.className = `badge ${reqInfo.className}`;
    dom.detailReqBadge.textContent = reqInfo.label;

    // 교육방식 배지
    const methodInfo = CONFIG.METHOD_INFO[course.method] || { icon: 'book', label: course.method };
    dom.detailMethodBadge.innerHTML = `<i data-lucide="${methodInfo.icon}"></i> <span>${methodInfo.label}</span>`;

    // 4. 벤토 그리드
    dom.bentoPeriod.textContent = course.period || '상시';
    dom.bentoApplyPeriod.textContent = course.applyPeriod || '상시';
    dom.bentoMethodHours.textContent = `${course.method} / ${course.hours}`;
    dom.bentoCapacity.textContent = course.capacity || '무제한';
    dom.bentoTarget.textContent = course.target || '전 직원';

    // 담당부서 및 전화번호 처리
    dom.bentoDeptContact.textContent = course.contact || course.department;

    // 5. 상세 소개 본문
    dom.descBody.textContent = course.description || '등록된 상세 소개 내용이 없습니다.';

    // 6. 학습 목표 리스트
    if (course.objectives && course.objectives.length > 0) {
      dom.objectivesList.innerHTML = course.objectives
        .map(
          (obj) => `
        <li class="objective-item">
          <i data-lucide="check-circle-2"></i>
          <span>${escapeHtml(obj)}</span>
        </li>
      `
        )
        .join('');
    } else {
      dom.objectivesList.innerHTML = '<li class="objective-item"><span>해당 과정의 학습 목표가 준비 중입니다.</span></li>';
    }

    // 7. 주요 내용 (커리큘럼) 그리드
    if (course.curriculum && course.curriculum.length > 0) {
      dom.curriculumGrid.innerHTML = course.curriculum
        .map(
          (curr, idx) => `
        <div class="curriculum-card">
          <span class="curriculum-step-badge">STEP ${idx + 1}</span>
          <span class="curriculum-title">${escapeHtml(curr)}</span>
        </div>
      `
        )
        .join('');
    } else {
      dom.curriculumGrid.innerHTML = '<div class="curriculum-card"><span class="curriculum-title">주요 교육 내용이 준비 중입니다.</span></div>';
    }

    // 8. 액션 바 (신청 및 문의 버튼)
    if (course.applyUrl && course.applyUrl.startsWith('http')) {
      dom.btnApply.href = course.applyUrl;
      dom.btnApply.target = '_blank';
      dom.btnApply.style.display = 'inline-flex';
    } else {
      dom.btnApply.href = 'https://hrd.pusan.ac.kr';
      dom.btnApply.target = '_blank';
    }

    // 전화번호 추출 (051-xxx-xxxx)
    const phoneMatch = (course.contact || '').match(/\d{2,3}-\d{3,4}-\d{4}/);
    if (phoneMatch) {
      dom.btnCall.href = `tel:${phoneMatch[0]}`;
      dom.btnCall.style.display = 'inline-flex';
      dom.btnCall.querySelector('span').textContent = `문의 (${phoneMatch[0]})`;
    } else {
      dom.btnCall.style.display = 'none';
    }

    // 9. 연관 연수 추천
    renderRelatedCourses(course, allCourses);

    // 표시 전환
    dom.contentSection.style.display = 'block';

    // Lucide 아이콘 초기화
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 동일 카테고리 연관 연수 추천 카드 렌더링
   */
  function renderRelatedCourses(currentCourse, allCourses) {
    dom.relatedCategoryName.textContent = currentCourse.category;

    let related = allCourses.filter(
      (c) => c.category === currentCourse.category && c.code !== currentCourse.code
    );

    // 동일 카테고리 연수가 부족할 경우 전체 과정 중 추천
    if (related.length === 0) {
      related = allCourses.filter((c) => c.code !== currentCourse.code).slice(0, 3);
    } else {
      related = related.slice(0, 3);
    }

    dom.relatedCoursesGrid.innerHTML = related
      .map((c) => {
        const reqInfo = CONFIG.REQUIREMENT_BADGES[c.requirement] || CONFIG.REQUIREMENT_BADGES['선택'];
        return `
        <article class="course-card">
          <div class="card-header">
            <span class="badge ${reqInfo.className}">${reqInfo.label}</span>
            <span class="card-code">${escapeHtml(c.code)}</span>
          </div>
          <h4 class="card-title" style="min-height: auto; margin-bottom: 8px;">${escapeHtml(c.name)}</h4>
          <p class="card-summary" style="min-height: auto; margin-bottom: 14px;">${escapeHtml(c.summary)}</p>
          <div class="card-footer" style="padding-top: 10px;">
            <span class="card-dept">${escapeHtml(c.department)}</span>
            <a href="detail.html?code=${encodeURIComponent(c.code)}" class="btn-card-detail">
              보기 <i data-lucide="chevron-right"></i>
            </a>
          </div>
        </article>
      `;
      })
      .join('');
  }

  function showNotFound(customMsg) {
    dom.loadingState.style.display = 'none';
    dom.contentSection.style.display = 'none';
    dom.notFoundSection.style.display = 'block';
    if (customMsg) {
      const desc = dom.notFoundSection.querySelector('.not-found-desc');
      if (desc) desc.textContent = customMsg;
    }
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function copyPageUrl() {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        showToast('연수 안내 링크가 클립보드에 복사되었습니다.');
      })
      .catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('연수 안내 링크가 복사되었습니다.');
      });
  }

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
