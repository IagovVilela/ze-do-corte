"use client";

type Props = {
  children: React.ReactNode;
};

/**
 * Wrapper visual do marketplace (Onyx & Azure).
 * Nav/footer vêm do layout `(public)`.
 */
export function ExploreChrome({ children }: Props) {
  return (
    <div className="explore-onyx bg-[#10131a] text-[#e1e2ec]">{children}</div>
  );
}
