'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Masthead } from '@/components/layout/Masthead';
import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Notification } from '@/components/ui/Notification';
import { SkipLink } from '@/components/ui/SkipLink';
import { useFlow } from '@/context/FlowContext';
import { ApiError, fetchAnswer } from '@/lib/api';
import {
  SCENARIO_PRESETS,
  getScenarioPreset,
  type ScenarioPresetId,
} from '@/lib/scenarioPresets';
import type { AnswerRequest } from '@/types/api';

import styles from './page.module.css';

interface AnswerErrorState {
  message: string;
  retryable: boolean;
  payload: AnswerRequest;
}

export default function AfterPage() {
  const router = useRouter();
  const { state, dispatch } = useFlow();
  const mainRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const answerSubmittingRef = useRef(false);
  const [statement, setStatement] = useState(state.user_statement);
  const [selectedPresetId, setSelectedPresetId] = useState<ScenarioPresetId | null>(
    state.selected_preset_id,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<AnswerErrorState | null>(null);

  const trimmedStatement = statement.trim();
  const characterCount = trimmedStatement.length;
  const isShort = characterCount > 0 && characterCount < 10;
  const canSubmit = characterCount >= 10 && !isLoading;
  const selectedPreset = getScenarioPreset(selectedPresetId);
  const isPresetQueryMatched =
    selectedPreset !== null && trimmedStatement === selectedPreset.query;

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const focusTarget = textareaRef.current ?? mainRef.current;
      focusTarget?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const helperText = useMemo(() => {
    if (isShort) {
      return '상황을 10자 이상 입력하면 법 조문 찾기를 시작할 수 있습니다.';
    }

    if (selectedPreset) {
      return isPresetQueryMatched
        ? `${selectedPreset.label} 프리셋이 입력되었습니다.`
        : `${selectedPreset.label} 프리셋을 바탕으로 수정 중입니다.`;
    }

    return '해고, 임금, 퇴직금, 사업장 변경, 육아휴직처럼 핵심 사실을 함께 적어주세요.';
  }, [isPresetQueryMatched, isShort, selectedPreset]);

  function buildAnswerPayload(): AnswerRequest | null {
    if (trimmedStatement.length < 10) {
      return null;
    }

    const preset = getScenarioPreset(selectedPresetId);

    return {
      query: trimmedStatement,
      top_k: preset ? preset.recommendedTopK : 5,
      ef_search: 100,
    };
  }

  async function submitStatement(payload = buildAnswerPayload()) {
    if (!payload || answerSubmittingRef.current) {
      return;
    }

    answerSubmittingRef.current = true;
    setIsLoading(true);
    setErrorState(null);
    const preset = getScenarioPreset(selectedPresetId);
    dispatch({
      type: 'SET_STATEMENT',
      payload: {
        statement: payload.query,
        selected_preset_id: preset?.id ?? null,
      },
    });

    try {
      const answer =
        preset && trimmedStatement === preset.query
          ? preset.fixedAnswer
          : await fetchAnswer(payload);

      dispatch({ type: 'SET_ANSWER', payload: answer });
      router.push('/after/result');
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : '연결을 확인하고 다시 시도해주세요.';
      const retryable = error instanceof ApiError ? error.retryable : true;

      setErrorState({ message, retryable, payload });
    } finally {
      setIsLoading(false);
      answerSubmittingRef.current = false;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitStatement();
  }

  function handleStatementChange(value: string) {
    setStatement(value);
    setErrorState(null);
  }

  function handlePresetClick(presetId: ScenarioPresetId) {
    const preset = getScenarioPreset(presetId);

    if (!preset) {
      return;
    }

    setStatement(preset.query);
    setSelectedPresetId(preset.id);
    setErrorState(null);
    dispatch({
      type: 'SET_STATEMENT',
      payload: {
        statement: preset.query,
        selected_preset_id: preset.id,
      },
    });
  }

  return (
    <>
      <SkipLink />
      <Masthead isLoading={isLoading} />
      <main id="main-content" ref={mainRef} tabIndex={-1} className={styles.main}>
        <section className={styles.heroSection} aria-labelledby="after-title">
          <div className={styles.heroGlowPrimary} />
          <div className={styles.heroGlowSecondary} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>After flow · grounded answer</p>
              <h1 id="after-title" className={styles.title}>
                지금 상황을 적으면
                <br />
                관련 조문과 초안 작성 가능 여부를 먼저 확인합니다
              </h1>
              <p className={styles.lead}>
                해고, 임금, 퇴직금, 사업장 변경처럼 핵심 사실을 적어주세요. 현재 구현은
                SCN-004 문서 초안 흐름을 중심으로 연결됩니다.
              </p>

              <div className={styles.heroStats} aria-label="현재 흐름 특징">
                <div className={styles.statCard}>
                  <strong>Step 1</strong>
                  <span>상황 입력과 preset 시작</span>
                </div>
                <div className={styles.statCard}>
                  <strong>Answer</strong>
                  <span>cited articles와 cautions 확인</span>
                </div>
                <div className={styles.statCard}>
                  <strong>Draft</strong>
                  <span>가능한 경우 문서 초안으로 이어짐</span>
                </div>
              </div>
            </div>

            <aside className={styles.heroPanel} aria-label="지원 범위 안내">
              <div className={styles.heroPanelCard}>
                <p className={styles.panelEyebrow}>Current support</p>
                <h2 className={styles.panelTitle}>현재 바로 확인 가능한 흐름</h2>
                <ul className={styles.panelList}>
                  <li>근거 기반 answer와 cited articles</li>
                  <li>SCN-004 문서 초안 eligibility guard</li>
                  <li>고용노동청 진정서 / 노동위원회 이유서 초안</li>
                </ul>
              </div>
              <div className={styles.heroPanelStrip}>
                <span className={styles.stripLabel}>Live path</span>
                <p>`/after → /after/result → /after/intake → /after/draft`</p>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.workspaceSection} aria-labelledby="statement-title">
          <div className={styles.workspaceInner}>
            <form
              className={styles.formCard}
              onSubmit={handleSubmit}
              aria-busy={isLoading || undefined}
            >
              <div className={styles.formHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Step 1</p>
                  <h2 id="statement-title" className={styles.sectionTitle}>
                    상황 입력
                  </h2>
                  <p className={styles.sectionBody}>
                    지금 겪은 상황을 자연스럽게 적어주세요. 빈틈 없이 쓰지 않아도 되고,
                    핵심 사실만 있어도 됩니다.
                  </p>
                </div>
                <span className={styles.counter}>{characterCount}자</span>
              </div>

              <div className={styles.fieldBlock}>
                <label className={styles.label} htmlFor="statement">
                  한국어 진술
                </label>
                <textarea
                  id="statement"
                  ref={textareaRef}
                  className={styles.textarea}
                  value={statement}
                  onChange={(event) => handleStatementChange(event.target.value)}
                  disabled={isLoading}
                  aria-label="노동권 상황 진술"
                  aria-describedby="statement-helper"
                  placeholder="예: 회사에서 갑자기 그만 나오라고 했고 서면통지는 받지 못했습니다. 마지막 임금과 퇴직금도 아직 받지 못했습니다."
                />
                <p
                  id="statement-helper"
                  className={isShort ? styles.warningText : styles.helperText}
                >
                  {helperText}
                </p>
              </div>

              <div className={styles.presetBlock}>
                <div className={styles.blockHeader}>
                  <div>
                    <p className={styles.sectionEyebrow}>Presentation preset</p>
                    <h3 className={styles.blockTitle}>바로 시작할 수 있는 예시 흐름</h3>
                  </div>
                  <span className={styles.blockMeta}>exact preset path 지원</span>
                </div>

                <div className={styles.presetGrid}>
                  {SCENARIO_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={isSelected ? styles.presetCardActive : styles.presetCard}
                        onClick={() => handlePresetClick(preset.id)}
                        disabled={isLoading}
                        aria-pressed={isSelected}
                      >
                        <span className={styles.presetBadge}>{preset.scenarioId}</span>
                        <strong className={styles.presetTitle}>{preset.label}</strong>
                        <span className={styles.presetDescription}>
                          {preset.supportsDraft
                            ? 'answer 확인 후 document draft flow까지 이어지는 preset입니다.'
                            : 'answer 확인 전용 preset으로, 결과 화면까지만 이어집니다.'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorState ? (
                <Notification
                  variant="error"
                  title="법 조문 검색 실패"
                  actionLabel={errorState.retryable ? '다시 시도하기' : undefined}
                  onAction={
                    errorState.retryable
                      ? () => void submitStatement(errorState.payload)
                      : undefined
                  }
                  onClose={() => setErrorState(null)}
                >
                  <p>{errorState.message}</p>
                </Notification>
              ) : null}

              <div className={styles.actionRow}>
                <Button type="submit" isLoading={isLoading} disabled={!canSubmit}>
                  법 조문 찾기 →
                </Button>
              </div>
            </form>

            <aside className={styles.supportColumn} aria-label="입력 안내">
              <section className={styles.supportCard}>
                <p className={styles.sectionEyebrow}>Writing tips</p>
                <h2 className={styles.supportTitle}>이렇게 적으면 바로 분석하기 좋아요</h2>
                <ul className={styles.supportList}>
                  <li>언제 통보를 받았는지</li>
                  <li>서면통지 여부나 메시지 기록이 있는지</li>
                  <li>임금, 퇴직금, 마지막 근무일 같은 핵심 사실</li>
                </ul>
              </section>

              <section className={styles.supportCard}>
                <p className={styles.sectionEyebrow}>Current demo scope</p>
                <h2 className={styles.supportTitle}>현재 데모에서 바로 이어지는 문서</h2>
                <ul className={styles.supportList}>
                  <li>고용노동청 임금체불 진정서 초안</li>
                  <li>노동위원회 부당해고 구제신청 이유서 초안</li>
                </ul>
              </section>

              <DisclaimerBanner>
                <p>
                  이 단계에서는 answer와 cited articles를 먼저 확인합니다. 문서 초안은
                  근거가 확인된 경우에만 다음 단계에서 열립니다.
                </p>
              </DisclaimerBanner>
            </aside>
          </div>
        </section>

        <section className={styles.bottomSection}>
          <div className={styles.bottomInner}>
            <div className={styles.bottomCard}>
              <p className={styles.sectionEyebrow}>What happens next</p>
              <h2 className={styles.bottomTitle}>입력 후에는 이런 순서로 이어집니다</h2>
              <div className={styles.bottomSteps}>
                <div className={styles.stepCard}>
                  <strong>01</strong>
                  <span>answer, key points, cautions 확인</span>
                </div>
                <div className={styles.stepCard}>
                  <strong>02</strong>
                  <span>문서 유형 선택 가능 여부 판단</span>
                </div>
                <div className={styles.stepCard}>
                  <strong>03</strong>
                  <span>case intake 입력 후 초안 생성</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
