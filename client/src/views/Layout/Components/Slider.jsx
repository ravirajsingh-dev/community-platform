import React, { useEffect, useState, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { getSliderBanners } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import SocialIcons from "@src/views/Common/SocialIcons/SocialIcons";
import { hasSocialLinks } from "@src/views/Common/SocialIcons/socialPlatforms";

const SliderComponent = ({
  banners: propBanners = null,
  autoplaySpeed = 6000,
  autoplay = true,
  pauseOnHover = true,
  common: { commonSettings, loadingCommonSettings } = {},
}) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const sliderRef = useRef(null);

  const hero = commonSettings?.hero || {};
  const brandName = hero.title?.trim() || "";
  const tagline = typeof hero.tagline === "string" ? hero.tagline : "";
  const heroButtons = Array.isArray(hero.buttons) ? hero.buttons : [];
  const socialMedia = commonSettings?.socialMedia || {};
  const showSocialSection = hasSocialLinks(socialMedia);

  useEffect(() => {
    if (propBanners === null) {
      const fetchBanners = async () => {
        try {
          const data = await getSliderBanners();
          setBanners(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Error fetching banners:", error);
          setBanners([]);
        } finally {
          setLoading(false);
        }
      };
      fetchBanners();
    } else {
      setBanners(Array.isArray(propBanners) ? propBanners : []);
      setLoading(false);
    }
  }, [propBanners]);

  useEffect(() => {
    if (!autoplay || banners.length <= 1 || isPaused || loading) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, autoplaySpeed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, autoplaySpeed, banners.length, isPaused, loading]);

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  const goToSlide = useCallback(
    (index) => {
      if (index >= 0 && index < banners.length) {
        setCurrentSlide(index);
      }
    },
    [banners.length],
  );

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [goToPrev, goToNext]);

  const scrollToDonation = (e) => {
    e.preventDefault();
    document.getElementById("donation")?.scrollIntoView({ behavior: "smooth" });
  };

  const renderHeroButton = (button, index) => {
    const path = button.path?.trim() || "#";
    const label = button.label?.trim() || "Button";
    const variant = button.variant || "ghost";
    const className = `home-btn home-btn--${variant} home-btn--compact`;

    if (path.startsWith("#")) {
      return (
        <a
          key={button.id || `${label}-${index}`}
          href={path}
          className={className}
          onClick={path === "#donation" ? scrollToDonation : undefined}
        >
          {label}
        </a>
      );
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return (
        <a
          key={button.id || `${label}-${index}`}
          href={path}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      );
    }

    return (
      <Link key={button.id || `${label}-${index}`} to={path} className={className}>
        {label}
      </Link>
    );
  };

  const renderHeroContent = () => {
    const hasTitle = Boolean(brandName);
    const hasTagline = Boolean(tagline.trim());
    const hasActions = heroButtons.length > 0;

    if (!hasTitle && !hasTagline && !hasActions && !showSocialSection) {
      return null;
    }

    return (
      <div className="home-hero__content">
        <div className="home-hero__content-inner">
          {hasTitle ? (
            <h1 className="home-hero__title">
              Welcome to {brandName}
            </h1>
          ) : null}

          {hasTagline ? <p className="home-hero__tagline">{tagline}</p> : null}

          {hasActions ? (
            <div className="home-hero__actions">
              {heroButtons.map((button, index) => renderHeroButton(button, index))}
            </div>
          ) : null}

          {showSocialSection ? (
            <div className="home-hero__social">
              <span className="home-hero__social-label">Follow Us</span>
              <SocialIcons
                socialMedia={socialMedia}
                size="small"
                className="home-hero__social-icons"
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (loading || loadingCommonSettings) {
    return (
      <section className="home-hero home-hero--loading">
        <div className="home-hero__loader">
          <BouncingLoader />
        </div>
      </section>
    );
  }

  if (banners.length === 0) {
    return (
      <section className="home-hero home-hero--empty">
        <div className="home-hero__slider home-hero__slider--empty">
          <div className="home-hero__fallback-bg" aria-hidden="true" />
        </div>
        {renderHeroContent()}
      </section>
    );
  }

  const activeBanner = banners[currentSlide];

  return (
    <section className="home-hero" ref={sliderRef} aria-label="Homepage hero slider">
      <div
        className="home-hero__slider"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="home-hero__slides">
          {banners.map((banner, index) => (
            <div
              key={banner._id || index}
              className={`home-hero__slide${
                index === currentSlide ? " home-hero__slide--active" : ""
              }`}
              aria-hidden={index !== currentSlide}
            >
              <img
                src={banner.imageUrl}
                alt={banner.title || `Slide ${index + 1}`}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        {activeBanner?.title ? (
          <p className="home-hero__slide-caption">{activeBanner.title}</p>
        ) : null}

        {banners.length > 1 ? (
          <div className="home-hero__dots" role="tablist" aria-label="Slide navigation">
            {banners.map((banner, index) => (
              <button
                key={banner._id || index}
                type="button"
                role="tab"
                aria-selected={index === currentSlide}
                aria-label={`Go to slide ${index + 1}`}
                className={`home-hero__dot${
                  index === currentSlide ? " home-hero__dot--active" : ""
                }`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
        ) : null}

        {banners.length > 1 ? (
          <div className="home-hero__progress" aria-hidden="true">
            <span
              key={currentSlide}
              className="home-hero__progress-bar"
              style={{ animationDuration: `${autoplaySpeed}ms` }}
            />
          </div>
        ) : null}
      </div>

      {renderHeroContent()}
    </section>
  );
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps)(SliderComponent);
