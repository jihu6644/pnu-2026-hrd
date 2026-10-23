/**
 * 2026 부산대학교 교직원 직무연수 웹사이트 전역 설정
 */
const CONFIG = {
  // Google Sheets GViz CSV 엔드포인트 (&headers=1 필수 적용: 32개 전체 과정 로드)
  SHEET_CSV_URL: 'https://docs.google.com/spreadsheets/d/1sWeq6LCPTp0I6ith07XQizLm-KcDvAcbeNZBHkOBOvk/gviz/tq?tqx=out:csv&sheet=data&headers=1',
  
  // 로컬 백업용 정제 CSV (오프라인 fallback)
  FALLBACK_CSV_PATH: './sheet_clean.csv',
  
  // 캐시 설정
  CACHE_KEY: 'PNU_HRD_2026_DATA',
  CACHE_TTL_MS: 30 * 1000, // 30초 캐시 (새로고침 시 실시간 반영 우선)
  
  // 기본 분류 탭 정의
  CATEGORIES: [
    '전체',
    '법정의무교육',
    '직무공통·문서',
    '예산·회계·계약',
    '인사·노무',
    '정보화·AI·데이터',
    '대학행정 특화',
    '소통·CS·민원',
    '리더십·역량',
    '안전·보건',
    '어학·글로벌'
  ],

  // 이수구분 스타일 매핑
  REQUIREMENT_BADGES: {
    '필수': { className: 'badge-required', label: '필수', dotColor: '#DC2626' },
    '필수(해당자)': { className: 'badge-required-conditional', label: '필수(해당)', dotColor: '#EA580C' },
    '권장': { className: 'badge-recommended', label: '권장', dotColor: '#0284C7' },
    '선택': { className: 'badge-optional', label: '선택', dotColor: '#64748B' }
  },

  // 교육방식 아이콘 및 라벨
  METHOD_INFO: {
    '온라인': { icon: 'monitor', label: '온라인' },
    '집합': { icon: 'users', label: '집합' },
    '혼합': { icon: 'layers', label: '혼합(온/오프)' }
  }
};
