import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

interface SectionLinkProps {
  hash: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

/**
 * Links to a section of the landing page.
 * On the landing page itself it behaves as a normal anchor;
 * on other routes it navigates to /homepage#hash.
 */
const SectionLink = ({ hash, className, children, ...rest }: SectionLinkProps) => {
  const { pathname } = useLocation();
  const isLanding = pathname === "/" || pathname === "/homepage";
  const clean = hash.replace(/^#/, "");

  if (isLanding) {
    return (
      <a href={`#${clean}`} className={className} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link to={`/homepage#${clean}`} className={className} {...rest}>
      {children}
    </Link>
  );
};

export default SectionLink;
