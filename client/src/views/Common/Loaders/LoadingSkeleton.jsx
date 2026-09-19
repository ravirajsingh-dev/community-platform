import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const LoadingSkeleton = ({
  count = 1,
  circle = false,
  className = "",
}) => {
  return (
    <span
      aria-live="polite"
      aria-busy="true"
      className={className}
    >
      <Skeleton
        count={count}
        circle={circle}
        inline={true}
        className={className}
        baseColor="var(--base-color)"
        highlightColor="var(--highlight-color)"
      />
    </span>
  );
};

export default LoadingSkeleton;
