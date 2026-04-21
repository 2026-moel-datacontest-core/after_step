# Main/Second Merge Integration Guide

기준일: `2026-04-21`

목적:

- 현재 저장소를 **main** 기준 프로젝트로 유지한다.
- 다른 코드베이스를 **second**로 두고, UI/정보 구조를 선택적으로 가져올 때의 기준을 고정한다.
- merge 전에 이 저장소의 실제 파이프라인, 런타임 의존성, source of truth, 파일 경계를 한 번에 확인할 수 있도록 한다.

---

## 1. Merge 기본 원칙

- 이 저장소가 **main**이다.
- 법령 데이터, RAG 파이프라인, API contract, eval/verify 기준은 **main을 유지**한다.
- second에서 중요한 것은 **UI의 주요 정보, 화면 구성, 카피, 정보 구조**다.
- second의 UI를 가져오더라도 **backend contract에 맞춰 frontend를 적응시키는 방식**으로 merge한다.
- second의 코드가 main의 RAG / document draft / eval 기준을 덮어쓰면 안 된다.

즉, merge의 기본 방향은 아래와 같다.

1. 데이터/검색/답변/문서초안 엔진은 main 유지
2. UI 표현, 정보 배치, 콘텐츠 구조는 second에서 선별 흡수
3. 연결 지점은 main의 frontend route/component 계층에서 처리

---

## 2. Main 프로젝트 전체 파이프라인

현재 저장소의 실제 동작 파이프라인은 아래 순서다.

### A. 법령 원본 수집

- 원본 법령 데이터: `data/legalize-kr/`
- 이 폴더는 git submodule이다.
- 직접 수정 대상이 아니다.

### B. 전처리 / 청킹 파이프라인

실행 순서:

1. `scripts/step1_select_effective_snapshots.py`
2. `scripts/step4_chunk_articles.py`
3. `scripts/step5_normalize.py`
4. `scripts/step6_split_long_articles.py`
5. `scripts/step7_finalize_metadata.py`
6. `scripts/step8_dedupe_and_validate.py`
7. `scripts/step9_quality_check.py`
8. `scripts/step10_finalize.py`

산출물:

- 법률별 청크 JSON: `backend/data/law_chunks/*.json`
- 최종 source of truth: `backend/data/law_chunks/all_chunks.json`

현재 기준:

- current live chunks: `1722`
- `selected_as_of = 2026-04-11`

### C. DB 적재 / 임베딩

입력:

- `backend/data/law_chunks/all_chunks.json`

실행 파일:

- `backend/scripts/ingest_chunks.py`
- `backend/scripts/embed_chunks.py`

결과:

- PostgreSQL + pgvector의 `law_chunks` 테이블
- `embedding` 768차원 저장
- HNSW 인덱스 사용

### D. Retrieval API

엔드포인트:

- `POST /api/v1/retrieve`

핵심 파일:

- `backend/main.py`
- `backend/app/routers/retrieval.py`
- `backend/app/services/retrieval.py`
- `backend/app/services/embedding.py`

역할:

- 질문 임베딩 생성
- pgvector cosine retrieval
- `top_k`, `ef_search` 기반 검색
- 일부 긴 질의는 selective decomposition 적용

### E. Grounded Answer API

엔드포인트:

- `POST /api/v1/answer`

핵심 파일:

- `backend/app/routers/answer.py`
- `backend/app/services/answer_generation.py`
- `backend/app/services/retrieval.py`

역할:

- retrieval 결과를 기반으로 answer 생성
- `grounded_context_ids` 관리
- `cited_articles` 생성
- 검색 context 밖 citation 금지
- JSON/schema/citation grounding 검증

### F. Document Draft API

엔드포인트:

- `POST /api/v1/documents/draft`

핵심 파일:

- `backend/app/routers/document_draft.py`
- `backend/app/services/document_draft.py`
- `backend/app/schemas/document_draft.py`

역할:

- `/api/v1/answer`에서 전달된 legal basis와 case intake를 합쳐 초안 생성
- 현재는 SCN-004 문서 2종 지원
- deterministic template 방식
- 입력되지 않은 사실은 `missing_fields`로 남김

### G. Frontend Demo Flow

현재 route:

- `/`
- `/after`
- `/after/result`
- `/after/intake`
- `/after/draft`

핵심 흐름:

1. `/after`
   - 상황 입력
   - preset 또는 live answer 호출
2. `/after/result`
   - answer / key_points / cautions / cited_articles 표시
   - document type 선택
3. `/after/intake`
   - 사건 정보 입력
   - `buildCaseIntake()` + `buildLegalBasis()` 조립
4. `/after/draft`
   - rendered_text, legal basis, cautions, missing fields 표시
   - copy / print

핵심 연결 파일:

- `frontend/src/lib/api.ts`
- `frontend/src/types/api.ts`
- `frontend/src/context/FlowContext.tsx`

### H. 검증 / 재현성 확인

빠른 검증:

- `backend/verify/check_retrieval.py`
- `backend/verify/check_answer_generation.py`
- `backend/verify/check_document_draft.py`

평가:

- `eval/run_retrieval_eval.py`
- `eval/run_answer_eval.py`
- `eval/run_answer_evidence_report.py`

제출 전 프리플라이트:

- `scripts/demo_preflight.sh`

---

## 3. 런타임 의존성

### Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- pgvector
- Google Vertex AI
- `google-genai`
- `google-auth`
- `python-dotenv`

주요 파일:

- `backend/requirements.txt`
- `backend/app/db.py`
- `backend/app/services/embedding.py`

필수 외부 의존성:

- PostgreSQL + pgvector
- GCP credentials / Vertex runtime

### Frontend

- Node.js
- Next.js `16.2.4`
- React `19.2.5`
- TypeScript

주요 파일:

- `frontend/package.json`

### Data / Infra

- `data/legalize-kr/` submodule
- `backend/data/law_chunks/all_chunks.json`

---

## 4. Source Of Truth

merge 시 절대 기준으로 봐야 하는 파일/영역은 아래다.

### 데이터 source of truth

- `backend/data/law_chunks/all_chunks.json`

### 검색/답변 source of truth

- `backend/app/services/retrieval.py`
- `backend/app/services/answer_generation.py`
- `backend/app/services/embedding.py`

### 문서 초안 source of truth

- `backend/app/schemas/document_draft.py`
- `backend/app/services/document_draft.py`

### API contract source of truth

- `backend/app/schemas/retrieval.py`
- `backend/app/schemas/answer.py`
- `backend/app/schemas/document_draft.py`
- `frontend/src/types/api.ts`

### 데모 flow source of truth

- `frontend/src/context/FlowContext.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/app/after/page.tsx`
- `frontend/src/app/after/result/page.tsx`
- `frontend/src/app/after/intake/page.tsx`
- `frontend/src/app/after/draft/page.tsx`

### 검증 기준 source of truth

- `backend/verify/*`
- `eval/*`
- `scripts/demo_preflight.sh`

---

## 5. Merge 시 파일 분류

아래 분류대로 생각하면 충돌이 줄어든다.

### A. 반드시 main 유지

이 그룹은 second가 덮어쓰면 안 된다.

- `backend/app/services/retrieval.py`
- `backend/app/services/answer_generation.py`
- `backend/app/services/embedding.py`
- `backend/app/services/document_draft.py`
- `backend/app/schemas/*.py`
- `backend/app/models/law_chunk.py`
- `backend/app/db.py`
- `backend/main.py`
- `backend/alembic/**`
- `backend/scripts/ingest_chunks.py`
- `backend/scripts/embed_chunks.py`
- `backend/data/law_chunks/**`
- `scripts/step*.py`
- `eval/**`
- `backend/verify/**`

설명:

- 이 영역은 main의 법령/검색/답변/문서초안 엔진이다.
- second가 여기까지 들어오면 merge가 아니라 다른 프로젝트로 바뀐다.

### B. main 유지, 단 연결용 수정 가능

이 그룹은 main을 기준으로 유지하되, second UI를 붙이기 위해 수정될 수 있다.

- `frontend/src/types/api.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/context/FlowContext.tsx`
- `frontend/src/lib/scn004DraftEligibility.ts`
- `frontend/src/lib/scenarioPresets.ts`
- `frontend/package.json`

설명:

- 여기서는 main contract를 유지해야 한다.
- second UI가 추가로 요구하는 필드나 상태가 있으면, main 구조를 깨지 않는 범위에서 adapter를 추가한다.
- 특히 `frontend/src/lib/api.ts`는 second와 main 사이의 변환 계층이 되기 좋다.

### C. second 내용을 적극적으로 흡수할 수 있는 영역

UI의 주요 정보가 second에 있다면, 실제 merge 작업은 주로 이 영역에서 일어난다.

- `frontend/src/app/**`
- `frontend/src/components/**`
- `frontend/src/app/globals.css`
- `frontend/src/**/*.module.css`

설명:

- 화면 구조
- 정보 배치
- 문구
- 스타일
- 컴포넌트 조합

이런 것들은 second에서 가져와도 된다.
다만 API 호출 방식과 데이터 구조는 main에 맞춰 연결해야 한다.

### D. 문서 기준으로만 참고

- `docs/planning/**`
- `docs/ops/**`
- `README.md`
- `CLAUDE.md`
- `AGENTS.md`

설명:

- 이 영역은 merge 시 코드를 직접 움직이진 않지만, 구조적 판단의 기준이다.

---

## 6. 추천 merge 전략

UI의 주요 정보가 second에 있다면, 아래 방식이 가장 안전하다.

### 전략 요약

- **backend first 유지**
- **frontend adapter merge**
- **UI/content selective import**

### 추천 순서

1. main backend와 API contract를 먼저 고정한다.
2. second UI에서 가져올 화면, 정보 구조, 콘텐츠를 route별로 분해한다.
3. second UI를 main frontend route 구조에 맞게 옮긴다.
4. second UI가 기대하는 데이터 구조를 확인한다.
5. 필요한 경우 `frontend/src/lib/api.ts`에 adapter 함수를 추가한다.
6. second의 디자인 시스템이나 스타일 파일은 `frontend/src/components/**`, `frontend/src/app/**`, CSS 계층으로만 흡수한다.
7. 마지막에 build, smoke, draft flow를 돌려서 회귀를 확인한다.

### 왜 이 순서가 좋은가

- main의 검색/답변/문서초안은 이미 freeze 기준과 eval 기준이 있다.
- second의 강점은 UI 정보 구조이므로, 이를 presentation layer에 한정해서 흡수하는 편이 리스크가 작다.
- API contract를 나중에 맞추려 하면 충돌이 커진다.

---

## 7. 실제 merge 작업에서 우선 확보할 파일

second와 합칠 때 이 저장소에서 먼저 복사/참조 대상으로 잡아야 할 파일은 아래다.

### 1순위: 절대 기준 파일

- `backend/app/schemas/answer.py`
- `backend/app/schemas/document_draft.py`
- `frontend/src/types/api.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/context/FlowContext.tsx`

이유:

- second UI가 어떤 화면을 가지고 있어도, 최종 연결은 이 타입과 helper를 기준으로 맞춰야 한다.

### 2순위: 실제 엔드투엔드 동작 기준 파일

- `frontend/src/app/after/page.tsx`
- `frontend/src/app/after/result/page.tsx`
- `frontend/src/app/after/intake/page.tsx`
- `frontend/src/app/after/draft/page.tsx`
- `frontend/src/lib/scn004DraftEligibility.ts`

이유:

- 현재 main의 working flow가 이미 이 파일들에 있다.
- second UI는 보통 이 route들에 덮어씌우기보다, 이 파일들을 기준으로 구조를 교체하거나 내부 컴포넌트를 바꾸는 형태가 안전하다.

### 3순위: UI 구성 참고 파일

- `frontend/src/components/intake/**`
- `frontend/src/components/draft/**`
- `frontend/src/components/ui/**`
- `frontend/src/components/layout/**`

이유:

- second에서 가져온 UI 정보를 main route에 넣을 때 가장 많이 수정되는 영역이다.

### 4순위: merge 후 회귀 확인 파일

- `backend/verify/check_document_draft.py`
- `eval/run_retrieval_eval.py`
- `eval/run_answer_eval.py`
- `scripts/demo_preflight.sh`

이유:

- merge 이후 “겉모양만 붙고 실제 기능이 깨진 상태”를 가장 빨리 잡을 수 있다.

---

## 8. second에서 가져와도 좋은 것 / 가져오면 안 되는 것

### 가져와도 좋은 것

- 화면 hierarchy
- 카드 구성
- 섹션 순서
- 문구 / 정보 구조
- 강조 방식
- 디자인 시스템 토큰
- CSS / 레이아웃
- page/component 단의 UI interaction

### main에 맞게 변환해서 가져와야 하는 것

- form state 구조
- API request shape
- response parsing
- route transitions
- draft eligibility 판단

### 가져오면 안 되는 것

- main과 충돌하는 backend contract
- main과 다른 retrieval/answer logic
- 검증 없이 추가된 citation/법률 처리 로직
- main의 `all_chunks.json`과 다른 데이터 기준
- eval/verify를 무시하는 custom answer flow

---

## 9. merge 이후 최소 검증 순서

### 필수

1. `python -c "from backend.main import app; print('import_ok')"`
2. `python backend/verify/check_document_draft.py`
3. `cd frontend && npm run build`

### 권장

4. `bash scripts/demo_preflight.sh`

### 회귀 의심 시

5. `python eval/run_retrieval_eval.py --top-k 5 --ef-search 100`
6. `python eval/run_answer_eval.py --top-k 5 --ef-search 100 --limit 60`

---

## 10. merge 실무 메모

- second의 UI 정보가 중요해도, 우선은 **main의 page/component 경계에 second의 정보 구조를 이식**하는 방식이 좋다.
- second가 별도 상태 관리 체계나 API helper를 갖고 있다면, 그대로 들여오기보다 `frontend/src/lib/api.ts`와 `FlowContext`에 맞추어 adapter 계층을 두는 것이 안전하다.
- merge 초기에 `frontend/src/types/api.ts`를 먼저 고정하면, 이후 UI 통합이 훨씬 쉬워진다.
- backend와 frontend를 동시에 크게 바꾸지 말고, 먼저 frontend presentation merge를 끝낸 뒤 필요 시 adapter만 얇게 추가하는 편이 낫다.

---

## 11. 추천 작업 단위

실제 merge는 아래 단위로 끊는 것을 권장한다.

1. contract freeze
2. second UI 정보 구조 분석
3. main route mapping
4. component merge
5. styling merge
6. adapter 보완
7. smoke/build/verify

이 순서면 rollback도 쉽고, 어디서 깨졌는지도 빠르게 잡힌다.
