import { Fragment, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Container } from "react-bootstrap";
import ScrollReveal from "./ScrollReveal";

const TEXT_LINE_CLAMP = 7;

export const PlainTextBlocks = ({ text }) => {
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

PlainTextBlocks.propTypes = {
  text: PropTypes.string,
};

const AboutDescription = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef(null);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    if (expanded) return undefined;

    const measure = () => {
      const el = bodyRef.current;
      if (!el) return;
      setCanExpand(el.scrollHeight > el.clientHeight + 2);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text, expanded]);

  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  return (
    <div
      className={`home-about__text${expanded ? " home-about__text--expanded" : ""}`}
    >
      <div ref={bodyRef} className="home-about__text-body">
        <PlainTextBlocks text={text} />
      </div>
      {canExpand && !expanded ? (
        <button
          type="button"
          className="home-about__read-more"
          onClick={() => setExpanded(true)}
        >
          ...Read more
        </button>
      ) : null}
      {canExpand && expanded ? (
        <button
          type="button"
          className="home-about__read-more"
          onClick={() => setExpanded(false)}
        >
          Read less
        </button>
      ) : null}
    </div>
  );
};

AboutDescription.propTypes = {
  text: PropTypes.string,
};

export const getVisibleAboutSections = (aboutUs = {}) => {
  const sections = Array.isArray(aboutUs.sections) ? aboutUs.sections : [];
  return sections.filter(
    (sec) => sec?.heading?.trim() || sec?.description?.trim() || sec?.imageUrl,
  );
};

export const hasAboutUsContent = (aboutUs = {}) => {
  const visibleSections = getVisibleAboutSections(aboutUs);
  return Boolean(
    aboutUs.title?.trim() || aboutUs.intro?.trim() || visibleSections.length > 0,
  );
};

const AboutUsContent = ({ aboutUs = {}, embedded = false }) => {
  const visibleSections = getVisibleAboutSections(aboutUs);
  const pageTitle = aboutUs.title?.trim() || "About Us";
  const hasIntro = Boolean(aboutUs.intro?.trim());

  return (
    <div
      className={`home-about${embedded ? " home-about--embedded" : ""}`}
    >
      <Container>
        <article className="home-about__shell">
          <header className="home-about__intro">
            <ScrollReveal>
              <h2 className="home-about__title">{pageTitle}</h2>
              {hasIntro ? (
                <p className="home-about__lead">{aboutUs.intro.trim()}</p>
              ) : null}
              <span
                className="home-section-header__line home-about__intro-line"
                aria-hidden="true"
              />
            </ScrollReveal>
          </header>

          {visibleSections.length > 0 ? (
            <div className="home-about__body">
              {visibleSections.map((sec, index) => {
                const reverse = index % 2 === 1;
                const hasImage = Boolean(sec.imageUrl);
                const hasText =
                  Boolean(sec.heading?.trim()) ||
                  Boolean(sec.description?.trim());
                const rowMods = [
                  reverse ? "home-about__row--reverse" : "",
                  !hasImage && hasText ? "home-about__row--text-only" : "",
                  hasImage && !hasText ? "home-about__row--image-only" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <ScrollReveal
                    key={sec.id || `about-section-${index}`}
                    className={`home-about__row${rowMods ? ` ${rowMods}` : ""}`}
                    delay={index * 120}
                  >
                    {hasImage ? (
                      <figure className="home-about__media">
                        <img
                          src={sec.imageUrl}
                          alt={
                            sec.heading?.trim() || `Section ${index + 1}`
                          }
                          loading="lazy"
                        />
                      </figure>
                    ) : null}

                    {hasText ? (
                      <div className="home-about__copy">
                        {sec.heading?.trim() ? (
                          <h3 className="home-about__heading">
                            {sec.heading.trim()}
                            <span
                              className="home-section-header__line home-about__heading-line"
                              aria-hidden="true"
                            />
                          </h3>
                        ) : null}
                        {sec.description?.trim() ? (
                          <AboutDescription text={sec.description} />
                        ) : null}
                      </div>
                    ) : null}
                  </ScrollReveal>
                );
              })}
            </div>
          ) : null}
        </article>
      </Container>
    </div>
  );
};

AboutUsContent.propTypes = {
  aboutUs: PropTypes.object,
  embedded: PropTypes.bool,
};

export default AboutUsContent;
