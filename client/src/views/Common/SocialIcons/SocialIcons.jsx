import React from "react";
import PropTypes from "prop-types";
import {
  getPlatformIcon,
  getPlatformLabel,
  normalizeSocialLinks,
} from "./socialPlatforms";

/**
 * Reusable SocialIcons component
 * Displays admin-managed social media icons consistently across the application
 */
const SocialIcons = ({ socialMedia = {}, className = "", size = "medium" }) => {
  const socialLinks = normalizeSocialLinks(socialMedia);

  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <div className={`social-icons-wrapper social-icons-${size} ${className}`}>
      {socialLinks.map(({ id, platform, url }) => {
        const Icon = getPlatformIcon(platform);
        const label = getPlatformLabel(platform);

        return (
          <a
            key={id || platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon-link"
            aria-label={label}
          >
            <Icon className="social-icon" />
          </a>
        );
      })}
    </div>
  );
};

SocialIcons.propTypes = {
  socialMedia: PropTypes.shape({
    links: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        platform: PropTypes.string,
        url: PropTypes.string,
        order: PropTypes.number,
      }),
    ),
  }),
  className: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium", "large"]),
};

export default SocialIcons;
