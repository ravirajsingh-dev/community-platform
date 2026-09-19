import React, { useCallback, useEffect, useRef, useState } from "react";
import { getGalleryImages, getGallerySettings } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import HomeSectionHeader from "./HomeSectionHeader";
import GalleryLightbox from "./GalleryLightbox";

const GALLERY_COLS = 5;
const VISIBLE_ROWS = 5;
const VISIBLE_COUNT = GALLERY_COLS * VISIBLE_ROWS;
const PAGE_SIZE = VISIBLE_COUNT;
const GALLERY_GAP = 10;
const AUTO_SCROLL_MIN = VISIBLE_COUNT;

const formatPhotos = (images, pageNumber) =>
  images.map((img, index) => ({
    src: img.imageUrl,
    alt: `Gallery Image ${(pageNumber - 1) * PAGE_SIZE + index + 1}`,
    key: img._id || `${pageNumber}-${index}`,
  }));

const Gallery = () => {
  const [photos, setPhotos] = useState([]);
  const [settings, setSettings] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isManual, setIsManual] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const autoScrollFrameRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);
  const pageRef = useRef(1);

  hasMoreRef.current = hasMore;
  pageRef.current = page;
  loadingMoreRef.current = loadingMore;

  const shouldScroll = photos.length >= AUTO_SCROLL_MIN;

  const loadGalleryPage = useCallback(async (pageNumber, append = false) => {
    const result = await getGalleryImages({
      page: pageNumber,
      limit: PAGE_SIZE,
    });
    const images = Array.isArray(result?.data) ? result.data : [];
    const metadata = result?.metadata || {};
    const formattedPhotos = formatPhotos(images, pageNumber);

    setPhotos((prev) =>
      append ? [...prev, ...formattedPhotos] : formattedPhotos
    );
    setHasMore(Boolean(metadata.has_more));
    setPage(pageNumber);
  }, []);

  const ensureMoreLoaded = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadGalleryPage(pageRef.current + 1, true);
    } catch (error) {
      console.error("Error loading more gallery images:", error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loadGalleryPage]);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const [gallerySettings, firstPage] = await Promise.all([
          getGallerySettings(),
          getGalleryImages({ page: 1, limit: PAGE_SIZE }),
        ]);

        if (gallerySettings) {
          setSettings({
            title: gallerySettings.title || "",
            description: gallerySettings.description || "",
          });
        }

        const images = Array.isArray(firstPage?.data) ? firstPage.data : [];
        const metadata = firstPage?.metadata || {};

        setPhotos(formatPhotos(images, 1));
        setHasMore(Boolean(metadata.has_more));
        setPage(1);
      } catch (error) {
        console.error("Error fetching gallery:", error);
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

  // Prefetch remaining pages in background (for large galleries)
  useEffect(() => {
    if (loading || !hasMore || loadingMore) {
      return undefined;
    }

    const timer = setTimeout(() => {
      ensureMoreLoaded();
    }, 600);

    return () => clearTimeout(timer);
  }, [loading, hasMore, loadingMore, photos.length, ensureMoreLoaded]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      return undefined;
    }

    const measure = () => {
      const width = el.clientWidth;
      if (!width) {
        return;
      }
      const cell = (width - GALLERY_GAP * (GALLERY_COLS - 1)) / GALLERY_COLS;
      setViewportHeight(cell * VISIBLE_ROWS + GALLERY_GAP * (VISIBLE_ROWS - 1));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, photos.length]);

  const normalizeScrollPosition = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) {
      return;
    }

    const loopHeight = track.scrollHeight / 2;
    if (loopHeight > 0) {
      viewport.scrollTop = viewport.scrollTop % loopHeight;
    }
  }, []);

  const enableManualScroll = useCallback(() => {
    setIsManual(true);
  }, []);

  const disableManualScroll = useCallback(() => {
    normalizeScrollPosition();
    setIsManual(false);
  }, [normalizeScrollPosition]);

  // Auto-scroll via scrollTop; hover enables native manual scrolling
  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !shouldScroll || isManual || activeIndex >= 0) {
      return undefined;
    }

    const rowCount = Math.ceil(photos.length / GALLERY_COLS);
    const duration = Math.max(rowCount * 3.5, 28);
    let lastTime = 0;

    const tick = (timestamp) => {
      const loopHeight = track.scrollHeight / 2;
      if (loopHeight > 0) {
        if (lastTime) {
          const speed = loopHeight / duration;
          viewport.scrollTop += speed * ((timestamp - lastTime) / 1000);

          if (viewport.scrollTop >= loopHeight) {
            viewport.scrollTop -= loopHeight;
          }
        }
        lastTime = timestamp;
      }

      autoScrollFrameRef.current = requestAnimationFrame(tick);
    };

    autoScrollFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (autoScrollFrameRef.current) {
        cancelAnimationFrame(autoScrollFrameRef.current);
      }
    };
  }, [photos, shouldScroll, isManual, activeIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !shouldScroll || isManual) {
      return undefined;
    }

    const preventWheel = (event) => event.preventDefault();
    viewport.addEventListener("wheel", preventWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", preventWheel);
  }, [shouldScroll, isManual]);

  const openLightbox = (absoluteIndex) => setActiveIndex(absoluteIndex);
  const closeLightbox = () => setActiveIndex(-1);
  const goPrev = () =>
    setActiveIndex((prev) => (prev <= 0 ? photos.length - 1 : prev - 1));
  const goNext = () =>
    setActiveIndex((prev) => (prev >= photos.length - 1 ? 0 : prev + 1));

  const renderGrid = (keyPrefix) => (
    <div className="home-gallery__grid" aria-hidden={keyPrefix === "b-" || undefined}>
      {photos.map((photo, index) => (
        <button
          key={`${keyPrefix}${photo.key || index}`}
          type="button"
          className="home-gallery__thumb"
          onClick={() => openLightbox(index)}
          aria-label={`View image ${index + 1}`}
          tabIndex={keyPrefix === "b-" ? -1 : 0}
        >
          <img src={photo.src} alt={photo.alt} loading="lazy" />
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <section className="home-gallery home-section-surface">
        <div className="container">
          <BouncingLoader />
        </div>
      </section>
    );
  }

  if (photos.length === 0 && !settings.title && !settings.description) {
    return null;
  }

  return (
    <section className="home-gallery home-section-surface">
      <div className="container">
        <HomeSectionHeader
          title={settings.title || "Our Gallery"}
          description={settings.description || ""}
        />

        {photos.length > 0 ? (
          <div
            ref={viewportRef}
            className={`home-gallery__viewport ${
              shouldScroll ? "is-scrolling" : ""
            } ${isManual ? "is-manual" : ""}`}
            style={
              viewportHeight ? { height: `${viewportHeight}px` } : undefined
            }
            onMouseEnter={enableManualScroll}
            onMouseLeave={disableManualScroll}
            onTouchStart={enableManualScroll}
            onTouchEnd={disableManualScroll}
          >
            {shouldScroll ? (
              <div className="home-gallery__track" ref={trackRef}>
                {renderGrid("a-")}
                {renderGrid("b-")}
              </div>
            ) : (
              renderGrid("a-")
            )}
          </div>
        ) : null}
      </div>

      <GalleryLightbox
        photos={photos}
        activeIndex={activeIndex}
        onClose={closeLightbox}
        onPrev={goPrev}
        onNext={goNext}
      />
    </section>
  );
};

export default Gallery;
