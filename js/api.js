/**
 * Google Sheets 실시간 데이터 Fetch & PapaParse 파싱 모듈
 */
const CourseAPI = (() => {
  let memoryCache = null;
  let lastFetchTime = 0;

  /**
   * 구글 시트 또는 fallback CSV에서 데이터를 가져와 파싱
   * @param {boolean} forceRefresh - 캐시를 무시하고 실시간 강제 새로고침 여부
   * @returns {Promise<Array>} 정제된 연수 과정 배열
   */
  async function fetchCourses(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && memoryCache && (now - lastFetchTime < CONFIG.CACHE_TTL_MS)) {
      return memoryCache;
    }

    // 캐시 버스팅 파라미터 부착
    const url = `${CONFIG.SHEET_CSV_URL}&_cb=${now}`;

    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const sanitized = normalizeCourses(results.data);
            if (sanitized.length > 0) {
              memoryCache = sanitized;
              lastFetchTime = now;
              // 브라우저 세션 캐시 백업
              try {
                sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(sanitized));
              } catch (e) {
                // ignore storage error
              }
              resolve(sanitized);
              return;
            }
          }
          tryFallback(resolve, reject);
        },
        error: (err) => {
          console.warn('Google Sheet fetch failed, trying fallback...', err);
          tryFallback(resolve, reject);
        }
      });
    });
  }

  /**
   * 로컬 정제 CSV 또는 세션스토리지 폴백 로직
   */
  function tryFallback(resolve, reject) {
    // 1차: 세션스토리지 확인
    try {
      const cached = sessionStorage.getItem(CONFIG.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          memoryCache = parsed;
          resolve(parsed);
          return;
        }
      }
    } catch (e) {}

    // 2차: 로컬 백업 CSV 확인
    Papa.parse(CONFIG.FALLBACK_CSV_PATH, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const sanitized = normalizeCourses(results.data);
        memoryCache = sanitized;
        resolve(sanitized);
      },
      error: (fallbackErr) => {
        reject(new Error('모든 데이터 소스 로드에 실패했습니다.'));
      }
    });
  }

  /**
   * 다양한 형태의 구글 시트 원본 행을 표준 객체로 변환 및 정제
   */
  function normalizeCourses(rawRows) {
    return rawRows
      .map((row) => {
        // 컬럼명 앞뒤 공백 및 BOM 제거
        const cleanRow = {};
        for (const [k, v] of Object.entries(row)) {
          const cleanKey = k.trim().replace(/^\ufeff/, '');
          cleanRow[cleanKey] = (v || '').trim();
        }

        const code = cleanRow['과정코드'] || '';
        const name = cleanRow['과정명'] || '';

        // 유효하지 않은 행 제외
        if (!code || !name) return null;

        return {
          code: code,
          name: name,
          category: cleanRow['분야'] || '직무공통·문서',
          target: cleanRow['대상'] || '전 직원',
          requirement: cleanRow['이수구분'] || '선택',
          method: cleanRow['교육방식'] || '온라인',
          hours: cleanRow['교육시간'] || '-',
          capacity: cleanRow['정원'] || '무제한',
          period: cleanRow['교육기간'] || '상시',
          applyPeriod: cleanRow['신청기간'] || '상시',
          department: cleanRow['담당부서'] || '인재개발원',
          summary: cleanRow['한줄소개'] || '',
          description: cleanRow['상세소개'] || '',
          objectives: parseBulletPoints(cleanRow['학습목표'] || ''),
          curriculum: parseBulletPoints(cleanRow['주요내용'] || ''),
          applyUrl: cleanRow['신청링크'] || '#',
          contact: cleanRow['문의'] || ''
        };
      })
      .filter(Boolean);
  }

  /**
   * ' · ' 또는 줄바꿈, 쉼표 등으로 구분된 텍스트를 리스트로 분리
   */
  function parseBulletPoints(text) {
    if (!text) return [];
    // '·' 또는 줄바꿈으로 분리
    return text
      .split(/[·\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * 특정 과정코드로 개별 과정 조회
   */
  async function getCourseByCode(code) {
    const list = await fetchCourses();
    return list.find((c) => c.code.toLowerCase() === (code || '').toLowerCase()) || null;
  }

  return {
    fetchCourses,
    getCourseByCode
  };
})();
