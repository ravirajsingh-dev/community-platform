import React, { useEffect, useRef, useState } from "react";
import { getVideos, getVideoSettings } from "@src/actions/mediaActions";
import BouncingLoader from "@src/views/Common/Loaders/BouncingLoader";
import HomeSectionHeader from "./HomeSectionHeader";

const VISIBLE_ROWS = 2;
const DESKTOP_COLS = 3;
const MOBILE_COLS = 2;
const DESKTOP_BREAKPOINT = 992;

const getCols = (width) =>
  width >= DESKTOP_BREAKPOINT ? DESKTOP_COLS : MOBILE_COLS;

const getYouTubeId = (url = "") => {
  const match = String(url).match(
    /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

const getPlayUrl = (embedUrl = "") => {
  if (!embedUrl) {
    return embedUrl;
  }
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("rel", "0");
    return url.toString();
  } catch {
    const joiner = embedUrl.includes("?") ? "&" : "?";
    return `${embedUrl}${joiner}autoplay=1&rel=0`;
  }
};

const VideoCard = ({ video }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const youtubeId = getYouTubeId(video.embedUrl);
  const thumbnail = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    : null;

  return (
    <article className="home-video__card">
      <div className="home-video__frame">
        {isPlaying ? (
          <iframe
            src={getPlayUrl(video.embedUrl)}
            title={video.title || "Video"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="home-video__iframe"
          />
        ) : (
          <button
            type="button"
            className="home-video__preview"
            onClick={() => setIsPlaying(true)}
            aria-label={`Play ${video.title || "video"}`}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                className="home-video__thumb"
                loading="lazy"
              />
            ) : (
              <span className="home-video__thumb-fallback" aria-hidden />
            )}
            <span className="home-video__play" aria-hidden>
              <svg viewBox="0 0 68 48" focusable="false">
                <path
                  className="home-video__play-bg"
                  d="M66.52 7.42a8 8 0 0 0-5.63-5.66C55.57.5 34 .5 34 .5s-21.57 0-26.89 1.26a8 8 0 0 0-5.63 5.66A83.5 83.5 0 0 0 0 24a83.5 83.5 0 0 0 1.48 16.58 8 8 0 0 0 5.63 5.66C12.43 47.5 34 47.5 34 47.5s21.57 0 26.89-1.26a8 8 0 0 0 5.63-5.66A83.5 83.5 0 0 0 68 24a83.5 83.5 0 0 0-1.48-16.58z"
                />
                <path className="home-video__play-icon" d="M45 24 27 14v20" />
              </svg>
            </span>
          </button>
        )}
      </div>
      {video.title ? <h3 className="home-video__title">{video.title}</h3> : null}
    </article>
  );
};

const Video = () => {
  const [videos, setVideos] = useState([]);
  const [settings, setSettings] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [needsScroll, setNeedsScroll] = useState(false);

  const viewportRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const [videoSettings, videoData] = await Promise.all([
          getVideoSettings(),
          getVideos(),
        ]);

        if (videoSettings) {
          setSettings({
            title: videoSettings.title || "",
            description: videoSettings.description || "",
          });
        }

        setVideos(Array.isArray(videoData) ? videoData : []);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const grid = gridRef.current;
    if (!viewport || !grid || videos.length === 0) {
      return undefined;
    }

    const measure = () => {
      const width = viewport.clientWidth;
      if (!width) {
        return;
      }

      const cols = getCols(width);
      const cards = grid.querySelectorAll(".home-video__card");
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
  }, [loading, videos.length]);

  if (loading) {
    return (
      <section className="home-video home-section-surface">
        <div className="container">
          <BouncingLoader />
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="home-video home-section-surface">
      <div className="container">
        <HomeSectionHeader
          title={settings.title || "Watch Our Journey"}
          description={settings.description || ""}
        />

        <div
          ref={viewportRef}
          className={`home-video__viewport ${
            needsScroll ? "is-scrollable" : ""
          }`}
          style={
            needsScroll && viewportHeight
              ? { height: `${viewportHeight}px` }
              : undefined
          }
        >
          <div ref={gridRef} className="home-video__grid">
            {videos.map((video) => (
              <VideoCard key={video._id || video.embedUrl} video={video} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Video;
