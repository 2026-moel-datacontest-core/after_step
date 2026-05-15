'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Masthead } from '@/components/layout/Masthead';
import { Button } from '@/components/ui/Button';
import { CitationPill } from '@/components/ui/CitationPill';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Notification } from '@/components/ui/Notification';
import { SkipLink } from '@/components/ui/SkipLink';
import { useFlow } from '@/context/FlowContext';
import { hasDraftGrounding } from '@/lib/api';
import { getScn004DraftEligibility } from '@/lib/scn004DraftEligibility';
import { getScenarioPreset } from '@/lib/scenarioPresets';
import type { DocumentType } from '@/types/api';

import styles from './page.module.css';

const DOCUMENT_TYPES: Array<{
  value: DocumentType;
  title: string;
  subtitle: string;
  body: string;
}> = [
  {
    value: 'labor_office_wage_complaint',
    title: '고용노동청 임금체불 진정서 초안',
    subtitle: 'Labor office wage complaint',
    body: '퇴사 후 임금, 퇴직금, 금품청산 지연을 중심으로 정리합니다.',
  },
  {
    value: 'labor_commission_unfair_dismissal_brief',
    title: '노동위원회 부당해고 구제신청 이유서 초안',
    subtitle: 'Labor commission unfair dismissal brief',
    body: '해고 서면통지, 30일 전 예고, 구제신청 쟁점을 중심으로 정리합니다.',
  },
];

export default function AfterResultPage() {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { state, dispatch } = useFlow();
  const answer = state.answer_response;
  const activePreset = getScenarioPreset(state.selected_preset_id);
  const supportsDraft = activePreset?.supportsDraft ?? true;
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(
    state.selected_document_type,
  );
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!answer) {
      router.replace('/after');
    }
  }, [answer, router]);

  useEffect(() => {
    if (answer) {
      const frameId = window.requestAnimationFrame(() => {
        headingRef.current?.focus();
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [answer]);

  if (!answer) {
    return (
      <>
        <SkipLink />
        <Masthead />
        <main id="main-content" tabIndex={-1} className={styles.main}>
          <p className={styles.redirectMessage}>처음 단계로 이동합니다.</p>
        </main>
      </>
    );
  }

  const hasCitedArticles = answer.cited_articles.length > 0;
  const hasGrounding = hasDraftGrounding(answer);
  const eligibility = supportsDraft
    ? getScn004DraftEligibility(answer)
    : {
        isEligible: false,
        documentTypes: {
          labor_office_wage_complaint: false,
          labor_commission_unfair_dismissal_brief: false,
        },
      };
  const availableDocumentTypes = DOCUMENT_TYPES.filter(
    (documentType) => eligibility.documentTypes[documentType.value],
  );
  const hasAvailableDocumentTypes = availableDocumentTypes.length > 0;
  const selectedDocumentTypeIsAvailable =
    supportsDraft &&
    selectedDocumentType !== null &&
    eligibility.documentTypes[selectedDocumentType];
  const canProceedToDraftFlow = supportsDraft && hasGrounding && hasAvailableDocumentTypes;
  const statementSummary = truncateText(state.user_statement || answer.query, 180);
  const canShowAnswer = hasGrounding;

  function selectDocumentType(documentType: DocumentType) {
    if (!supportsDraft || !canProceedToDraftFlow || !eligibility.documentTypes[documentType]) {
      return;
    }

    setSelectedDocumentType(documentType);
    dispatch({ type: 'SET_DOCUMENT_TYPE', payload: documentType });
  }

  function handleTileKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    documentType: DocumentType,
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDocumentType(documentType);
    }
  }

  function handleNextClick() {
    if (!selectedDocumentTypeIsAvailable || !canProceedToDraftFlow || isNavigating) {
      return;
    }

    setIsNavigating(true);
    router.push('/after/intake');
  }

  function resetFlow() {
    dispatch({ type: 'RESET' });
    router.push('/after');
  }

  return (
    <>
      <SkipLink />
      <Masthead />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <section className={styles.heroSection} aria-labelledby="result-title">
          <div className={styles.heroGlowPrimary} />
          <div className={styles.heroGlowSecondary} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>Step 2 · grounded result</p>
              <h1 id="result-title" ref={headingRef} tabIndex={-1} className={styles.title}>
                관련 조문과 다음 문서 유형을 확인하세요
              </h1>
              <p className={styles.summaryText}>{statementSummary}</p>

              <div className={styles.heroStats} aria-label="현재 answer 상태">
                <div className={styles.statCard}>
                  <strong>{answer.cited_articles.length}</strong>
                  <span>cited articles</span>
                </div>
                <div className={styles.statCard}>
                  <strong>{answer.grounded_context_ids.length}</strong>
                  <span>grounded contexts</span>
                </div>
                <div className={styles.statCard}>
                  <strong>{availableDocumentTypes.length}</strong>
                  <span>draftable document types</span>
                </div>
              </div>
            </div>

            <aside className={styles.heroPanel} aria-label="결과 요약">
              <div className={styles.heroPanelCard}>
                <p className={styles.panelEyebrow}>Current state</p>
                <h2 className={styles.panelTitle}>
                  {canShowAnswer ? '근거 기반 answer를 확인했습니다' : '근거 확인이 더 필요합니다'}
                </h2>
                <ul className={styles.panelList}>
                  <li>{hasCitedArticles ? '인용 조문이 확인되었습니다.' : '인용 조문이 아직 없습니다.'}</li>
                  <li>
                    {hasGrounding
                      ? 'grounded context가 있어 다음 문서 단계 판단이 가능합니다.'
                      : 'grounded context가 없어 문서 초안 단계로 이어지지 않습니다.'}
                  </li>
                  <li>
                    {supportsDraft
                      ? '현재 preset/free input 기준으로 SCN-004 문서 초안 guard를 적용합니다.'
                      : '현재 preset은 answer 확인 전용으로 동작합니다.'}
                  </li>
                </ul>
              </div>
              <div className={styles.heroPanelStrip}>
                <span className={styles.stripLabel}>Selected preset</span>
                <p>{activePreset ? activePreset.label : 'free input path'}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.workspaceSection}>
          <div className={styles.contentGrid}>
            <section className={styles.resultColumn} aria-label="법 조문 검색 결과">
              {!canShowAnswer ? (
                <Notification variant="warning" title="근거 확인 필요">
                  <p>
                    인용된 법 조문 또는 근거 컨텍스트가 확인되지 않아 답변을 표시하지
                    않습니다. 입력을 보완해 다시 검색해주세요.
                  </p>
                </Notification>
              ) : (
                <>
                  <section className={styles.answerCard} aria-labelledby="answer-title">
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.sectionEyebrow}>Answer</p>
                        <h2 id="answer-title" className={styles.sectionTitle}>
                          답변
                        </h2>
                      </div>
                    </div>
                    <div className={styles.answerBody}>
                      {answer.answer.trim().length > 0 ? (
                        <p>{answer.answer}</p>
                      ) : (
                        <p>답변 본문을 생성하지 못했습니다.</p>
                      )}
                    </div>
                  </section>

                  <section className={styles.infoCard} aria-labelledby="key-points-title">
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.sectionEyebrow}>Key points</p>
                        <h2 id="key-points-title" className={styles.sectionTitle}>
                          핵심 포인트
                        </h2>
                      </div>
                    </div>
                    {answer.key_points.length > 0 ? (
                      <ul className={styles.list}>
                        {answer.key_points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyText}>표시할 핵심 포인트가 없습니다.</p>
                    )}
                  </section>

                  <section className={styles.cautionCard} aria-labelledby="cautions-title">
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.sectionEyebrow}>Cautions</p>
                        <h2 id="cautions-title" className={styles.sectionTitle}>
                          주의사항
                        </h2>
                      </div>
                    </div>
                    {answer.cautions.length > 0 ? (
                      <ul className={styles.list}>
                        {answer.cautions.map((caution) => (
                          <li key={caution}>{caution}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyText}>추가 주의사항이 없습니다.</p>
                    )}
                  </section>
                </>
              )}

              <section className={styles.infoCard} aria-labelledby="citations-title">
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.sectionEyebrow}>Cited articles</p>
                    <h2 id="citations-title" className={styles.sectionTitle}>
                      인용 조문
                    </h2>
                  </div>
                </div>
                {hasCitedArticles ? (
                  <div className={styles.citationList}>
                    {answer.cited_articles.map((article) => (
                      <CitationPill key={article} label={article} />
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyText}>확인된 인용 조문이 없습니다.</p>
                )}
              </section>

              {hasGrounding && activePreset && !activePreset.supportsDraft ? (
                <Notification variant="warning" title="답변 확인 전용 프리셋">
                  <p>
                    이 프리셋은 현재 답변 확인 전용입니다. SCN-004 문서 초안 선택지는
                    표시하지 않습니다.
                  </p>
                </Notification>
              ) : null}

              {hasGrounding && supportsDraft && !hasAvailableDocumentTypes ? (
                <Notification variant="warning" title="현재 문서 초안 지원 범위 밖">
                  <p>
                    답변은 확인할 수 있지만, 현재 문서 초안은 SCN-004의 해고·서면통지·해고예고·노동위원회·임금체불·퇴직금·금품청산 범위에서만 지원합니다.
                  </p>
                </Notification>
              ) : null}

              {!hasGrounding ? (
                <Notification variant="warning" title="문서 초안 진행 불가">
                  <p>
                    인용된 법 조문 또는 근거 컨텍스트가 확인되지 않았습니다. 문서 초안을 만들 수
                    없습니다.
                  </p>
                </Notification>
              ) : null}
            </section>

            <aside className={styles.selectorColumn} aria-labelledby="document-type-title">
              <section className={styles.selectorPanel}>
                <div className={styles.selectorHeader}>
                  <div>
                    <p className={styles.sectionEyebrow}>Draft flow</p>
                    <h2 id="document-type-title" className={styles.selectorTitle}>
                      다음 단계에서 만들 문서를 선택하세요
                    </h2>
                  </div>
                </div>

                {canProceedToDraftFlow ? (
                  <div
                    className={styles.radioGroup}
                    role="radiogroup"
                    aria-labelledby="document-type-title"
                  >
                    {availableDocumentTypes.map((documentType) => {
                      const isSelected = selectedDocumentType === documentType.value;

                      return (
                        <div
                          key={documentType.value}
                          className={isSelected ? styles.radioTileSelected : styles.radioTile}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => selectDocumentType(documentType.value)}
                          onKeyDown={(event) => handleTileKeyDown(event, documentType.value)}
                        >
                          <span className={styles.radioMarker} aria-hidden="true" />
                          <span className={styles.radioText}>
                            <span className={styles.radioTitle}>{documentType.title}</span>
                            <span className={styles.radioSubtitle}>{documentType.subtitle}</span>
                            <span className={styles.radioBody}>{documentType.body}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Notification
                    variant="warning"
                    title={
                      activePreset && !activePreset.supportsDraft
                        ? '답변 확인 전용 프리셋'
                        : hasGrounding
                          ? '현재 문서 초안 지원 범위 밖'
                          : '문서 초안 진행 불가'
                    }
                  >
                    <p>
                      {activePreset && !activePreset.supportsDraft
                        ? '이 프리셋은 현재 답변 확인 전용입니다.'
                        : hasGrounding
                          ? '이 답변은 확인할 수 있지만 SCN-004 문서 초안으로 이어지지 않습니다.'
                          : '인용된 법 조문 또는 근거 컨텍스트가 확인되지 않아 문서 유형을 선택할 수 없습니다.'}
                    </p>
                  </Notification>
                )}

                <div className={styles.selectorActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    disabled={
                      !selectedDocumentTypeIsAvailable || !canProceedToDraftFlow || isNavigating
                    }
                    isLoading={isNavigating}
                    onClick={handleNextClick}
                  >
                    사건 정보 입력하기 →
                  </Button>
                  <Button type="button" variant="ghost" fullWidth onClick={resetFlow}>
                    처음으로 돌아가기
                  </Button>
                </div>

                <DisclaimerBanner>
                  <p>
                    문서 초안은 answer에서 확인된 근거와 다음 단계의 사건 정보를 바탕으로만
                    생성됩니다.
                  </p>
                </DisclaimerBanner>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}...`;
}
