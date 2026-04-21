'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import styles from './page.module.css';

type CategoryId =
  | 'featured'
  | 'analysis'
  | 'generator'
  | 'storage'
  | 'consulting'
  | 'security';

interface Category {
  id: CategoryId;
  label: string;
  eyebrow: string;
  summary: string;
}

interface ServiceItem {
  title: string;
  description: string;
  href?: string;
  badge?: string;
}

interface NewsItem {
  tag: string;
  title: string;
  date: string;
  image: string;
}

interface SolutionItem {
  title: string;
  subtitle: string;
  accent: 'red' | 'orange' | 'blue' | 'purple' | 'teal';
  image: string;
}

const categories: Category[] = [
  {
    id: 'featured',
    label: '대표 서비스',
    eyebrow: 'Featured',
    summary: '가장 많이 찾는 법률 지원 기능을 한 번에 확인하세요.',
  },
  {
    id: 'analysis',
    label: '분석',
    eyebrow: 'Analysis',
    summary: '계약과 상황 진술을 토대로 위험 신호와 조문 근거를 빠르게 찾습니다.',
  },
  {
    id: 'generator',
    label: '작성',
    eyebrow: 'Generator',
    summary: '사건 핵심을 정리해 진정서와 이유서 초안으로 바로 이어집니다.',
  },
  {
    id: 'storage',
    label: '보관',
    eyebrow: 'Storage',
    summary: '증거 목록과 사건 경위를 누락 없이 정리할 수 있도록 돕습니다.',
  },
  {
    id: 'consulting',
    label: '연결',
    eyebrow: 'Consulting',
    summary: '추가 상담이나 다음 절차가 필요한 순간을 놓치지 않게 안내합니다.',
  },
  {
    id: 'security',
    label: '신뢰',
    eyebrow: 'Security',
    summary: '검색 근거 안에서만 답변하고, 확인이 필요한 정보는 분리해서 표시합니다.',
  },
];

const servicesByCategory: Record<CategoryId, ServiceItem[]> = {
  featured: [
    {
      title: '독소조항 탐색',
      description: '근로계약서의 핵심 조건과 위험 신호를 빠르게 읽어냅니다.',
      badge: 'Soon',
    },
    {
      title: '진위서 작성기',
      description: '해고, 임금체불, 퇴직금 이슈를 정리해 문서 초안 작성 흐름으로 연결합니다.',
      href: '/after',
      badge: 'Live',
    },
    {
      title: '근로 기록 정리',
      description: '날짜별 사건 경위와 증거 목록을 제출 전 검토용으로 정리합니다.',
    },
    {
      title: '상담 연결 포인트',
      description: '추가 확인이 필요한 항목과 주의사항을 우선순위로 보여줍니다.',
    },
  ],
  analysis: [
    {
      title: '계약/상황 분석',
      description: '사용자 입력에서 근로조건, 해고, 체불, 절차 문제를 식별합니다.',
    },
    {
      title: '조문 근거 추출',
      description: '관련 조문을 `cited_articles`와 grounded context로 바로 보여줍니다.',
    },
    {
      title: '핵심 포인트 요약',
      description: '긴 설명 대신 바로 행동에 필요한 포인트와 cautions를 분리합니다.',
    },
  ],
  generator: [
    {
      title: '진위서 작성기',
      description: '현재 구현된 SCN-004 흐름으로 바로 이동해 임금체불 진정서와 부당해고 이유서를 작성합니다.',
      href: '/after',
      badge: 'Start',
    },
    {
      title: '사건 정보 보강',
      description: '빈 항목은 placeholder로 남기고, 입력한 정보만 확정적으로 초안에 반영합니다.',
    },
    {
      title: '근거 기반 초안',
      description: '검색된 legal basis 안에서만 문서 초안을 구성합니다.',
    },
  ],
  storage: [
    {
      title: '증거 체크리스트',
      description: '메시지, 계약서, 급여명세서, 통장내역 등 필요한 자료를 정리합니다.',
    },
    {
      title: '사건 타임라인',
      description: '해고 통보일, 마지막 근무일, 체불 기간을 타임라인으로 모읍니다.',
    },
    {
      title: '누락 정보 식별',
      description: '문서 제출 전에 `missing_fields`로 빈칸을 다시 확인하게 합니다.',
    },
  ],
  consulting: [
    {
      title: '다음 단계 안내',
      description: '문서 작성 전후에 무엇을 확인해야 하는지 차분하게 안내합니다.',
    },
    {
      title: '기관 선택 보조',
      description: '노동청 진정과 노동위원회 구제신청처럼 경로가 다른 경우를 구분합니다.',
    },
    {
      title: '추가 상담 포인트',
      description: '사실관계가 더 필요한 경우 cautions를 통해 검토 포인트를 남깁니다.',
    },
  ],
  security: [
    {
      title: 'Grounded Answer',
      description: '검색 context 밖 조문을 끼워 넣지 않도록 citation grounding을 검증합니다.',
    },
    {
      title: 'Deterministic Draft',
      description: '문서 초안은 answer 결과와 case intake만을 사용해 결정론적으로 구성합니다.',
    },
    {
      title: 'Freeze-ready QA',
      description: 'eval, verify, preflight 기준으로 데모 재현성을 확인합니다.',
    },
  ],
};

const newsItems: NewsItem[] = [
  {
    tag: '서비스 출시',
    title: '진위서 작성기 베타 오픈과 SCN-004 문서 초안 흐름 공개',
    date: '2026.04.20',
    image:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=900',
  },
  {
    tag: '기능 업데이트',
    title: '근거 기반 답변에서 cited articles와 key points 표시 안정화',
    date: '2026.04.19',
    image:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=900',
  },
  {
    tag: 'QA 완료',
    title: '문서 초안 copy/print와 direct URL guard 동작 점검 완료',
    date: '2026.04.18',
    image:
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=900',
  },
  {
    tag: '데모 준비',
    title: 'presentation-local preset과 preflight 체크 기준 정리',
    date: '2026.04.17',
    image:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=900',
  },
];

const solutions: SolutionItem[] = [
  {
    title: '부당 해고 대응',
    subtitle: '해고 예고, 서면통지, 노동위원회 절차를 빠르게 정리합니다.',
    accent: 'red',
    image:
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: '임금 체불 해결',
    subtitle: '체불 임금, 금품 청산, 퇴직금 지급 쟁점을 문서 초안으로 연결합니다.',
    accent: 'orange',
    image:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: '직장 내 괴롭힘',
    subtitle: '증거 수집과 사건 경위 정리를 위한 구조를 제공합니다.',
    accent: 'blue',
    image:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: '근로 시간 분쟁',
    subtitle: '연장·야간·휴일 근로 관련 쟁점 분석 확장 후보를 위한 방향성을 제시합니다.',
    accent: 'purple',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: '휴직·돌봄 이슈',
    subtitle: 'SCN-005 확장 후보로 육아휴직과 가족돌봄 흐름을 준비합니다.',
    accent: 'teal',
    image:
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600',
  },
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('featured');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentCategory = useMemo(
    () => categories.find((category) => category.id === activeCategory) ?? categories[0],
    [activeCategory],
  );
  const currentServices = servicesByCategory[activeCategory];

  return (
    <main className={styles.pageShell}>
      <header className={isScrolled ? styles.headerScrolled : styles.header}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>법</span>
            <span className={styles.brandText}>
              법대로 <span className={styles.brandSub}>law-main-road</span>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label="주요 메뉴">
            <a href="#intro" className={styles.navLink}>
              소개
            </a>
            <a href="#services" className={styles.navLink}>
              서비스
            </a>
            <a href="#solutions" className={styles.navLink}>
              솔루션
            </a>
            <a href="#news" className={styles.navLink}>
              소식
            </a>
          </nav>

          <div className={styles.desktopActions}>
            <Link href="/after" className={styles.consoleLink}>
              진위서 작성 시작
            </Link>
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={isMenuOpen}
            aria-controls="home-mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? '닫기' : '메뉴'}
          </button>
        </div>

        {isMenuOpen ? (
          <div id="home-mobile-nav" className={styles.mobilePanel}>
            <a href="#intro" className={styles.mobileLink} onClick={() => setIsMenuOpen(false)}>
              소개
            </a>
            <a href="#services" className={styles.mobileLink} onClick={() => setIsMenuOpen(false)}>
              서비스
            </a>
            <a href="#solutions" className={styles.mobileLink} onClick={() => setIsMenuOpen(false)}>
              솔루션
            </a>
            <Link href="/after" className={styles.mobileCta} onClick={() => setIsMenuOpen(false)}>
              진위서 작성 시작
            </Link>
          </div>
        ) : null}
      </header>

      <section id="intro" className={styles.heroSection}>
        <div className={styles.heroGlowPrimary} />
        <div className={styles.heroGlowSecondary} />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Grounded labor-rights assistant</p>
            <h1 className={styles.heroTitle}>
              더 강해진 <span className={styles.heroAccent}>법대로 AI</span>로
              <br />
              근거 있는 진위서 작성을 시작하세요
            </h1>
            <p className={styles.heroBody}>
              근로기준법 학습 데이터와 grounded answer 흐름을 바탕으로,
              해고·임금체불 상황을 정리하고 필요한 문서 초안까지 이어집니다.
            </p>

            <div className={styles.heroActions}>
              <Link href="/after" className={styles.primaryAction}>
                진위서 작성기 열기
              </Link>
              <a href="#services" className={styles.secondaryAction}>
                서비스 둘러보기
              </a>
            </div>

            <ul className={styles.heroStats} aria-label="서비스 특징">
              <li>
                <strong>1722</strong>
                <span>live law chunks</span>
              </li>
              <li>
                <strong>3 APIs</strong>
                <span>retrieve, answer, draft</span>
              </li>
              <li>
                <strong>SCN-004</strong>
                <span>문서 초안 flow 운영 중</span>
              </li>
            </ul>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.heroPanelCard}>
              <p className={styles.panelLabel}>Main flow</p>
              <h2 className={styles.panelTitle}>진위서 작성기</h2>
              <p className={styles.panelBody}>
                서면통지 없는 해고, 30일 예고 누락, 임금·퇴직금 미지급 같은 상황을
                단계별로 정리해 현재 구현된 `/after` 서비스로 연결합니다.
              </p>
              <Link href="/after" className={styles.panelAction}>
                `/after` 서비스 열기
              </Link>
            </div>

            <div className={styles.heroPanelStrip}>
              <div>
                <span className={styles.stripLabel}>Answer</span>
                <p>grounded_context_ids, cited_articles</p>
              </div>
              <div>
                <span className={styles.stripLabel}>Draft</span>
                <p>rendered_text, missing_fields</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="news" className={styles.newsSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Updates</p>
              <h2 className={styles.sectionTitle}>법대로의 최신 소식을 확인하세요</h2>
            </div>
            <a href="#services" className={styles.sectionLink}>
              서비스 보기
            </a>
          </div>

          <div className={styles.newsGrid}>
            {newsItems.map((item) => (
              <article key={item.title} className={styles.newsCard}>
                <div className={styles.newsImageWrap}>
                  <img className={styles.newsImage} src={item.image} alt={item.title} />
                  <span className={styles.newsTag}>{item.tag}</span>
                </div>
                <p className={styles.newsDate}>{item.date}</p>
                <h3 className={styles.newsTitle}>{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className={styles.servicesSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Services</p>
          <h2 className={styles.sectionTitle}>
            효율적인 근로 권익 보호를 위한
            <br />
            다양한 서비스를 제공합니다
          </h2>

          <div className={styles.categoryTabs} role="tablist" aria-label="서비스 분류">
            {categories.map((category) => {
              const isActive = category.id === activeCategory;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={isActive ? styles.categoryTabActive : styles.categoryTab}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span className={styles.categoryEyebrow}>{category.eyebrow}</span>
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.servicesLayout}>
            <div className={styles.featurePanel}>
              <p className={styles.panelLabel}>{currentCategory.eyebrow}</p>
              <h3 className={styles.featureTitle}>{currentCategory.label}</h3>
              <p className={styles.featureBody}>{currentCategory.summary}</p>
              <div className={styles.featureGlyph}>법대로</div>
            </div>

            <div className={styles.serviceGrid}>
              {currentServices.map((service) =>
                service.href ? (
                  <Link key={service.title} href={service.href} className={styles.serviceCard}>
                    <div className={styles.serviceMeta}>
                      <span className={styles.serviceDot} />
                      {service.badge ? <span className={styles.serviceBadge}>{service.badge}</span> : null}
                    </div>
                    <h4 className={styles.serviceTitleLink}>{service.title}</h4>
                    <p className={styles.serviceBody}>{service.description}</p>
                    <span className={styles.serviceAction}>지금 실행하기</span>
                  </Link>
                ) : (
                  <article key={service.title} className={styles.serviceCard}>
                    <div className={styles.serviceMeta}>
                      <span className={styles.serviceDot} />
                      {service.badge ? <span className={styles.serviceBadge}>{service.badge}</span> : null}
                    </div>
                    <h4 className={styles.serviceTitle}>{service.title}</h4>
                    <p className={styles.serviceBody}>{service.description}</p>
                  </article>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className={styles.solutionsSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Solutions</p>
              <h2 className={styles.sectionTitle}>
                비즈니스 특성과 분쟁 상황을 고려한
                <br />
                법률 솔루션을 제안합니다
              </h2>
            </div>
            <Link href="/after" className={styles.primaryActionCompact}>
              작성 시작
            </Link>
          </div>

          <div className={styles.solutionGrid}>
            {solutions.map((solution) => (
              <article key={solution.title} className={styles.solutionCard}>
                <span className={styles[`solutionAccent${solution.accent}`]}>●</span>
                <h3 className={styles.solutionTitle}>{solution.title}</h3>
                <p className={styles.solutionBody}>{solution.subtitle}</p>
                <div className={styles.solutionImageWrap}>
                  <img className={styles.solutionImage} src={solution.image} alt={solution.title} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.bannerSection}>
        <div className={styles.sectionInner}>
          <div className={styles.bannerGrid}>
            <Link href="/after" className={styles.bannerPrimary}>
              <h3>진위서 작성 시작</h3>
              <p>현재 구현된 SCN-004 flow로 바로 이동합니다.</p>
            </Link>
            <article className={styles.bannerDark}>
              <h3>Grounded answer</h3>
              <p>검색 근거 밖 조문은 답변에 포함하지 않도록 검증합니다.</p>
            </article>
            <article className={styles.bannerLight}>
              <h3>Draft checklist</h3>
              <p>문서 초안 결과에서 missing fields와 evidence checklist를 따로 보여줍니다.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.closingSection}>
        <div className={styles.sectionInner}>
          <div className={styles.closingPanel}>
            <div>
              <p className={styles.sectionEyebrow}>Ready to start</p>
              <h2 className={styles.sectionTitle}>
                지금은 랜딩 페이지에서 시작하고,
                <br />
                실제 서비스는 현재 `/after` flow로 이어집니다
              </h2>
            </div>
            <div className={styles.closingActions}>
              <Link href="/after" className={styles.primaryAction}>
                진위서 작성기 열기
              </Link>
              <a href="#news" className={styles.secondaryActionLight}>
                업데이트 보기
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.sectionInner}>
          <div className={styles.footerGrid}>
            <div>
              <div className={styles.brandFooter}>
                <span className={styles.brandMark}>법</span>
                <span className={styles.brandText}>법대로</span>
              </div>
              <p className={styles.footerBody}>
                grounded answer와 document draft 흐름을 묶은
                <br />
                노동권 보호 지원 서비스 MVP입니다.
              </p>
            </div>

            <div>
              <h3 className={styles.footerHeading}>Flow</h3>
              <ul className={styles.footerList}>
                <li>/after</li>
                <li>/after/result</li>
                <li>/after/intake</li>
                <li>/after/draft</li>
              </ul>
            </div>

            <div>
              <h3 className={styles.footerHeading}>Main links</h3>
              <ul className={styles.footerList}>
                <li>
                  <Link href="/after">진위서 작성기</Link>
                </li>
                <li>
                  <a href="#services">서비스</a>
                </li>
                <li>
                  <a href="#solutions">솔루션</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
