import React, { useEffect, useRef, useState } from "react";
import { getNews, getNewsSettings } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import NewsDetailsModal from "@src/views/Common/Modal/NewsDetailsModal";
import HomeSectionHeader from "./HomeSectionHeader";

const VISIBLE_ROWS = 2;
const DESKTOP_COLS = 3;
const MOBILE_COLS = 2;
const DESKTOP_BREAKPOINT = 992;

const getCols = (width) =>
  width >= DESKTOP_BREAKPOINT ? DESKTOP_COLS : MOBILE_COLS;

const getNewsImages = (news) => {
  if (Array.isArray(news?.images) && news.images.length > 0) {
    return news.images.map((img) => img.imageUrl || img).filter(Boolean);
  }
  if (news?.imageUrl) {
    return [news.imageUrl];
  }
  return [];
};

const SLIDER_INTERVAL_MS = 3500;

const NewsCard = ({ news, onReadMore }) => {
  const images = getNewsImages(news);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (!hasMultiple) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, SLIDER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [hasMultiple, images.length]);

  return (
    <article
      className="home-news__card"
      role="button"
      tabIndex={0}
      onClick={() => onReadMore(news)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onReadMore(news);
        }
      }}
      aria-label={`Read more about ${news.title || "news"}`}
    >
      {images.length > 0 ? (
        <div className="home-news__media">
          {images.map((url, index) => (
            <img
              key={`${news._id}-${url}-${index}`}
              src={url}
              alt={news.title || "News"}
              loading={index === 0 ? "lazy" : "eager"}
              className={`home-news__slide ${
                index === activeIndex ? "is-active" : ""
              }`}
            />
          ))}
          {hasMultiple ? (
            <div className="home-news__dots" aria-hidden="true">
              {images.map((_, index) => (
                <span
                  key={`dot-${index}`}
                  className={`home-news__dot ${
                    index === activeIndex ? "is-active" : ""
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="home-news__media home-news__media--placeholder" />
      )}

      <div className="home-news__body">
        {news.createdAt ? (
          <time className="home-news__date" dateTime={news.createdAt}>
            {new Date(news.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
        ) : null}

        <h3 className="home-news__title">{news.title}</h3>

        {news.description ? (
          <p className="home-news__excerpt">
            {news.description.length > 150
              ? `${news.description.substring(0, 150)}...`
              : news.description}
          </p>
        ) : null}
      </div>

      <div className="home-news__hover" aria-hidden="true">
        <span className="home-news__hover-btn">Read More</span>
      </div>
    </article>
  );
};

const News = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [settings, setSettings] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [needsScroll, setNeedsScroll] = useState(false);

  const viewportRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const [newsSettings, newsData] = await Promise.all([
          getNewsSettings(),
          getNews(),
        ]);

        if (newsSettings) {
          setSettings({
            title: newsSettings.title || "",
            description: newsSettings.description || "",
          });
        }

        setNewsItems(Array.isArray(newsData) ? newsData : []);
      } catch (error) {
        console.error("Error fetching news:", error);
        setNewsItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const grid = gridRef.current;
    if (!viewport || !grid || newsItems.length === 0) {
      return undefined;
    }

    const measure = () => {
      const width = viewport.clientWidth;
      if (!width) {
        return;
      }

      const cols = getCols(width);
      const cards = grid.querySelectorAll(".home-news__card");
      if (cards.length === 0) {
        return;
      }

      const visibleCount = cols * VISIBLE_ROWS;
      if (cards.length <= visibleCount) {
        setNeedsScroll(false);
        setViewportHeight(0);
        return;
      }

      const firstTop = cards[0].getBoundingClientRect().top;
      let bottom = firstTop;
      for (let i = 0; i < visibleCount; i += 1) {
        bottom = Math.max(bottom, cards[i].getBoundingClientRect().bottom);
      }
      setViewportHeight(bottom - firstTop);
      setNeedsScroll(true);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [loading, newsItems.length]);

  const handleReadMore = (news) => {
    setSelectedNews(news);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNews(null);
  };

  if (loading) {
    return (
      <section className="home-news home-section-surface">
        <div className="container">
          <BouncingLoader />
        </div>
      </section>
    );
  }

  if (newsItems.length === 0) {
    return null;
  }

  return (
    <section className="home-news home-section-surface">
      <div className="container">
        <HomeSectionHeader
          title={settings.title || "Stay Updated"}
          description={
            settings.description ||
            "Read the latest updates on community initiatives, programs, and the positive change we're building together."
          }
        />

        <div
          ref={viewportRef}
          className={`home-news__viewport ${
            needsScroll ? "is-scrollable" : ""
          }`}
          style={
            needsScroll && viewportHeight
              ? { height: `${viewportHeight}px` }
              : undefined
          }
        >
          <div ref={gridRef} className="home-news__grid">
            {newsItems.map((news) => (
              <NewsCard
                key={news._id}
                news={news}
                onReadMore={handleReadMore}
              />
            ))}
          </div>
        </div>
      </div>

      <NewsDetailsModal
        show={showModal}
        onHide={handleCloseModal}
        newsItem={selectedNews}
      />
    </section>
  );
};

export default News;
