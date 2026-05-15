'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Masthead } from '@/components/layout/Masthead';
import {
  EvidenceSection,
  ensureEvidenceRowIds,
  ensureTimelineRowIds,
  type EvidenceItemRow,
  type TimelineRow,
} from '@/components/intake/EvidenceSection';
import { UnfairDismissalForm } from '@/components/intake/UnfairDismissalForm';
import { WageComplaintForm } from '@/components/intake/WageComplaintForm';
import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Notification } from '@/components/ui/Notification';
import { SkipLink } from '@/components/ui/SkipLink';
import { useFlow } from '@/context/FlowContext';
import {
  ApiError,
  buildCaseIntake,
  buildLegalBasis,
  fetchDraft,
  hasDraftGrounding,
} from '@/lib/api';
import { getScn004DraftEligibility } from '@/lib/scn004DraftEligibility';
import { getScenarioPreset } from '@/lib/scenarioPresets';
import type { CaseIntakeFormValues, DocumentType } from '@/types/api';

import styles from './page.module.css';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  labor_office_wage_complaint: '고용노동청 임금체불 진정서 초안',
  labor_commission_unfair_dismissal_brief: '노동위원회 부당해고 구제신청 이유서 초안',
};

interface DraftErrorState {
  message: string;
  retryable: boolean;
}

export default function AfterIntakePage() {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftSubmittingRef = useRef(false);
  const { state, dispatch } = useFlow();
  const answer = state.answer_response;
  const selectedDocumentType = state.selected_document_type;
  const activePreset = getScenarioPreset(state.selected_preset_id);
  const supportsDraft = activePreset?.supportsDraft ?? true;
  const hasGrounding = answer ? hasDraftGrounding(answer) : false;
  const eligibility = answer && supportsDraft ? getScn004DraftEligibility(answer) : null;
  const selectedDocumentTypeIsEligible =
    supportsDraft && selectedDocumentType !== null && eligibility !== null
      ? eligibility.documentTypes[selectedDocumentType]
      : false;
  const canUseDraftFlow = supportsDraft && hasGrounding && selectedDocumentTypeIsEligible;
  const [formValues, setFormValues] = useState<CaseIntakeFormValues>(
    () => state.case_intake_form ?? {},
  );
  const [incidentTimeline, setIncidentTimeline] = useState<TimelineRow[]>(() =>
    ensureTimelineRowIds(
      state.case_intake?.incident_timeline.length ? state.case_intake.incident_timeline : [],
    ),
  );
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItemRow[]>(() =>
    ensureEvidenceRowIds(state.case_intake?.evidence_items.length ? state.case_intake.evidence_items : []),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorState, setErrorState] = useState<DraftErrorState | null>(null);

  useEffect(() => {
    if (!answer) {
      router.replace('/after');
      return;
    }

    if (!hasGrounding || !selectedDocumentType || !selectedDocumentTypeIsEligible) {
      router.replace('/after/result');
      return;
    }
  }, [answer, hasGrounding, router, selectedDocumentType, selectedDocumentTypeIsEligible, supportsDraft]);

  useEffect(() => {
    if (answer && selectedDocumentType && canUseDraftFlow) {
      const frameId = window.requestAnimationFrame(() => {
        headingRef.current?.focus();
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [answer, canUseDraftFlow, selectedDocumentType]);

  if (!answer || !selectedDocumentType || !canUseDraftFlow) {
    return (
      <>
        <SkipLink />
        <Masthead />
        <main id="main-content" tabIndex={-1} className={styles.main}>
          <p className={styles.redirectMessage}>이전 단계로 이동합니다.</p>
        </main>
      </>
    );
  }

  const documentTypeLabel = DOCUMENT_TYPE_LABELS[selectedDocumentType];

  async function submitDraft() {
    if (!answer || !selectedDocumentType || draftSubmittingRef.current) {
      return;
    }

    if (!hasDraftGrounding(answer)) {
      setErrorState({
        message: '인용된 법 조문 또는 근거 컨텍스트가 확인되지 않아 문서 초안을 만들 수 없습니다.',
        retryable: false,
      });
      return;
    }

    if (!supportsDraft) {
      setErrorState({
        message: '이 프리셋은 현재 답변 확인 전용이라 문서 초안을 만들 수 없습니다.',
        retryable: false,
      });
      return;
    }

    const selectedEligibility = getScn004DraftEligibility(answer);

    if (!selectedEligibility.documentTypes[selectedDocumentType]) {
      setErrorState({
        message: '선택한 문서 타입을 뒷받침하는 SCN-004 근거가 없어 문서 초안을 만들 수 없습니다.',
        retryable: false,
      });
      return;
    }

    draftSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorState(null);

    const legalBasis = buildLegalBasis(answer);
    const caseIntake = buildCaseIntake({
      selected_document_type: selectedDocumentType,
      form_values: formValues,
      evidence_items: evidenceItems,
      incident_timeline: incidentTimeline,
    });

    dispatch({ type: 'SET_LEGAL_BASIS', payload: legalBasis });
    dispatch({ type: 'SET_CASE_INTAKE_FORM', payload: formValues });
    dispatch({ type: 'SET_CASE_INTAKE', payload: caseIntake });

    try {
      const draft = await fetchDraft({
        case_intake: caseIntake,
        legal_basis: legalBasis,
      });

      dispatch({ type: 'SET_DRAFT', payload: draft });
      router.push('/after/draft');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : '연결을 확인하고 다시 시도해주세요.';
      const retryable = error instanceof ApiError ? error.retryable : true;

      setErrorState({ message, retryable });
    } finally {
      setIsSubmitting(false);
      draftSubmittingRef.current = false;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitDraft();
  }

  function handleFormValuesChange(values: CaseIntakeFormValues) {
    setFormValues(values);
    setErrorState(null);
  }

  function handleEvidenceItemsChange(items: EvidenceItemRow[]) {
    setEvidenceItems(ensureEvidenceRowIds(items));
    setErrorState(null);
  }

  function handleIncidentTimelineChange(items: TimelineRow[]) {
    setIncidentTimeline(ensureTimelineRowIds(items));
    setErrorState(null);
  }

  function resetFlow() {
    dispatch({ type: 'RESET' });
    router.push('/after');
  }

  return (
    <>
      <SkipLink />
      <Masthead isLoading={isSubmitting} />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <section className={styles.heroSection} aria-labelledby="intake-title">
          <div className={styles.heroGlowPrimary} />
          <div className={styles.heroGlowSecondary} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>Step 3 · case intake</p>
              <h1 id="intake-title" ref={headingRef} tabIndex={-1} className={styles.title}>
                초안에 반영할 정보를 선택적으로 입력하세요
              </h1>
              <div className={styles.badgeRow}>
                <span className={styles.documentBadge}>{documentTypeLabel}</span>
              </div>
              <p className={styles.lead}>
                빈 항목은 제출을 막지 않습니다. 확인이 필요한 부분은 초안 결과에서 따로 표시됩니다.
              </p>
            </div>

            <aside className={styles.heroPanel} aria-label="입력 원칙">
              <div className={styles.heroPanelCard}>
                <p className={styles.panelEyebrow}>Input principles</p>
                <h2 className={styles.panelTitle}>현재 단계에서 기억할 점</h2>
                <ul className={styles.panelList}>
                  <li>입력하지 않은 사실은 자동 확정하지 않습니다.</li>
                  <li>사건 경위와 증거 목록은 제출 전 정리에 도움이 됩니다.</li>
                  <li>초안은 다음 단계에서 `missing_fields`와 함께 검토됩니다.</li>
                </ul>
              </div>
              <div className={styles.heroPanelStrip}>
                <span className={styles.stripLabel}>Current path</span>
                <p>`/after/result → /after/intake → /after/draft`</p>
              </div>
            </aside>
          </div>
        </section>

        <form className={styles.form} onSubmit={handleSubmit} aria-busy={isSubmitting || undefined}>
          <div className={styles.workspaceSection}>
            <div className={styles.workspaceInner}>
              <div className={isSubmitting ? styles.formContentDisabled : styles.formContent}>
                {selectedDocumentType === 'labor_office_wage_complaint' ? (
                  <WageComplaintForm
                    values={formValues}
                    disabled={isSubmitting}
                    onChange={handleFormValuesChange}
                  />
                ) : (
                  <UnfairDismissalForm
                    values={formValues}
                    disabled={isSubmitting}
                    onChange={handleFormValuesChange}
                  />
                )}

                <EvidenceSection
                  evidenceItems={evidenceItems}
                  incidentTimeline={incidentTimeline}
                  disabled={isSubmitting}
                  onEvidenceItemsChange={handleEvidenceItemsChange}
                  onIncidentTimelineChange={handleIncidentTimelineChange}
                />

                <DisclaimerBanner>
                  <p>
                    이 문서 초안은 제출 전 검토용입니다. 입력하지 않은 사실은 확정하지 않고 확인 필요 항목으로 남깁니다.
                  </p>
                </DisclaimerBanner>
              </div>

              <aside className={styles.supportColumn} aria-label="입력 지원 정보">
                <section className={styles.supportCard}>
                  <p className={styles.sectionEyebrow}>What helps most</p>
                  <h2 className={styles.supportTitle}>특히 채우면 좋은 정보</h2>
                  <ul className={styles.supportList}>
                    <li>입사일, 마지막 근무일, 통보일</li>
                    <li>미지급 금액이나 지급일 같은 수치 정보</li>
                    <li>메신저, 계약서, 급여명세서 같은 증거 자료</li>
                  </ul>
                </section>

                <section className={styles.supportCard}>
                  <p className={styles.sectionEyebrow}>Next step</p>
                  <h2 className={styles.supportTitle}>이후 생성되는 결과</h2>
                  <ul className={styles.supportList}>
                    <li>rendered_text 초안 본문</li>
                    <li>missing_fields와 cautions</li>
                    <li>evidence_checklist와 cited_articles</li>
                  </ul>
                </section>
              </aside>
            </div>
          </div>

          <div className={styles.stickyBar}>
            <div className={styles.stickyInner}>
              <div className={styles.stickyMessage}>
                {errorState ? (
                  <Notification
                    variant="error"
                    title="문서 초안 생성 실패"
                    actionLabel={errorState.retryable ? '다시 시도하기' : undefined}
                    onAction={errorState.retryable ? () => void submitDraft() : undefined}
                    onClose={() => setErrorState(null)}
                  >
                    <p>{errorState.message}</p>
                  </Notification>
                ) : null}
              </div>
              <div className={styles.actions}>
                <Button type="button" variant="ghost" disabled={isSubmitting} onClick={resetFlow}>
                  처음으로 돌아가기
                </Button>
                <Button type="submit" variant="secondary" isLoading={isSubmitting} disabled={isSubmitting}>
                  문서 초안 생성하기 →
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
