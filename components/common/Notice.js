// src/components/common/Notice.js (REVISED)

// This is also now a simple, synchronous Server Component.
export default function Notice({ data }) {
  const currentDate = new Date();
  const startDate = new Date(data?.start);
  const endDate = new Date(data?.end);

  const isValid = data && currentDate >= startDate && currentDate <= endDate;

  if (!isValid) {
    return null;
  }

  // Note: <marquee> is deprecated. A CSS animation is better for performance and accessibility.
  // But for now, this works.
  return <marquee className="pt-1">{data.notice}</marquee>;
}
