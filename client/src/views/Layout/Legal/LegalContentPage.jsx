import { Fragment, useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom";
import { Container } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { getLegalPageBySlug } from "@src/actions/legalPageActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/views/Common/NoRecordsFound/NoRecordsFound";

const LEGAL_SLUGS = new Set([
  "returns-and-refunds",
  "privacy-policy",
  "terms-and-conditions",
]);

const LEGAL_CRUMB_LABELS = {
  "returns-and-refunds": "Refunds",
  "privacy-policy": "Privacy Policy",
  "terms-and-conditions": "Terms & Conditions",
};

const pathToSlug = (pathname) => {
  const seg = pathname.replace(/^\//, "").split("/")[0];
  return seg?.split("?")[0] || "";
};

const PlainTextBlocks = ({ text }) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j, arr) => (
            <Fragment key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
};

const LegalContentPage = ({ getLegalPageBySlug }) => {
  const { pathname } = useLocation();
  const slug = useMemo(() => pathToSlug(pathname), [pathname]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState({ title: "", intro: "", sections: [] });
  const [error, setError] = useState(false);

  const validSlug = LEGAL_SLUGS.has(slug);

  const displayPageTitle = useMemo(() => {
    if (!validSlug) return "Page not found";
    const custom = page.title?.trim();
    if (custom) return custom;
    return LEGAL_CRUMB_LABELS[slug] || "Legal information";
  }, [validSlug, slug, page.title]);

  useEffect(() => {
    if (!validSlug) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setPage({ title: "", intro: "", sections: [] });
    setError(false);
    const run = async () => {
      setLoading(true);
      const result = await getLegalPageBySlug(slug);
      if (!cancelled) {
        if (result?.status && result.data) {
          setPage(result.data);
        } else {
          setError(true);
          setPage({ title: "", intro: "", sections: [] });
        }
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [slug, validSlug, getLegalPageBySlug]);

  if (!validSlug) {
    return (
      <section className="legal-content-page">
        <Helmet>
          <title>Page not found</title>
        </Helmet>
        <Container className="legal-content-page-inner py-5 my-md-3">
          <header className="legal-content-page-header legal-content-page-header--centered mb-4">
            <h1 className="legal-content-page-title">{displayPageTitle}</h1>
          </header>
          <NoRecordsFound title="This page is not available." compact />
        </Container>
      </section>
    );
  }

  if (loading) {
    const loadingTitle = LEGAL_CRUMB_LABELS[slug] || "Legal information";
    return (
      <section className="legal-content-page">
        <Helmet>
          <title>{loadingTitle}</title>
        </Helmet>
        <Container className="legal-content-page-inner py-5 my-md-3">
          <header className="legal-content-page-header legal-content-page-header--centered mb-4">
            <h1 className="legal-content-page-title">{loadingTitle}</h1>
          </header>
          <BouncingLoader />
        </Container>
      </section>
    );
  }

  if (error) {
    const errorTitle = LEGAL_CRUMB_LABELS[slug] || "Legal information";
    return (
      <section className="legal-content-page">
        <Helmet>
          <title>{errorTitle}</title>
        </Helmet>
        <Container className="legal-content-page-inner py-5 my-md-3">
          <header className="legal-content-page-header legal-content-page-header--centered mb-4">
            <h1 className="legal-content-page-title">{errorTitle}</h1>
          </header>
          <NoRecordsFound
            title="We could not load this page. Please try again later."
            compact
          />
        </Container>
      </section>
    );
  }

  const sections = page.sections || [];
  const introText = page.intro?.trim() || "";
  const hasContent = sections.some(
    (s) => String(s?.heading || "").trim() || String(s?.text || "").trim(),
  );

  return (
    <section className="legal-content-page">
      <Helmet>
        <title>{displayPageTitle}</title>
      </Helmet>
      <Container className="legal-content-page-inner py-5 my-md-3">
        <header className="legal-content-page-header legal-content-page-header--centered mb-4">
          <h1 className="legal-content-page-title">{displayPageTitle}</h1>
          {introText ? (
            <div className="legal-content-page-intro">
              <PlainTextBlocks text={introText} />
            </div>
          ) : null}
        </header>
        {hasContent ? (
          <div className="legal-content-body">
            {sections.map((sec, i) => {
              const h = String(sec?.heading || "").trim();
              const t = String(sec?.text || "").trim();
              if (!h && !t) return null;
              return (
                <section key={i} className="legal-content-section mb-4">
                  {h ? <h2 className="legal-content-section-heading">{h}</h2> : null}
                  {t ? <PlainTextBlocks text={sec.text} /> : null}
                </section>
              );
            })}
          </div>
        ) : (
          <NoRecordsFound
            title={`Content for "${displayPageTitle}" has not been published yet.`}
            compact
          />
        )}
      </Container>
    </section>
  );
};

export default connect(null, { getLegalPageBySlug })(LegalContentPage);
