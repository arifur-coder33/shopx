import locations from "@/utils/data/bangladesh-all-thanas.json";

const normalize = (value) => String(value || "")
  .toLocaleLowerCase("en")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/gu, "")
  .replace(/[অ|আ]/gu, "a")
  .replace(/[ড়ঢ়]/gu, "r")
  .replace(/[ঃঁং]/gu, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/gu, " ");

const districts = locations.flatMap((division) => division.districts.map((district) => ({
  en: district.district_en,
  bn: district.district_bn,
  thanas: district.thanas.map((thana) => ({ en: thana.thana_en, bn: thana.thana_bn })),
})));

const editDistance = (left, right) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[right.length];
};

function findPlace(address, places) {
  const input = normalize(address);
  const exact = places
    .map((place) => ({ place, en: normalize(place.en), bn: normalize(place.bn) }))
    .filter(({ en, bn }) => (en && ` ${input} `.includes(` ${en} `)) || (bn && ` ${input} `.includes(` ${bn} `)))
    .sort((a, b) => Math.max(b.en.length, b.bn.length) - Math.max(a.en.length, a.bn.length));
  if (exact.length) return exact[0].place;

  // Match common Banglish spelling variants against the place names in the official list.
  const words = input.split(" ").filter((word) => word.length >= 4);
  let best = null;
  for (const place of places) {
    const en = normalize(place.en);
    const bn = normalize(place.bn);
    const names = [en, bn].filter(Boolean);
    for (const name of names) {
      const parts = name.split(" ");
      const width = parts.length;
      for (let i = 0; i <= words.length - width; i += 1) {
        const candidate = words.slice(i, i + width).join(" ");
        const maxLength = Math.max(name.length, candidate.length);
        const similarity = maxLength ? 1 - editDistance(candidate, name) / maxLength : 0;
        if (similarity >= 0.82 && (!best || similarity > best.similarity)) best = { place, similarity };
      }
    }
  }
  return best?.place || null;
}

export function parseBangladeshAddress(address) {
  const value = String(address || "").trim();
  if (value.length < 8) return { valid: false, error: "সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন—বাসা/রোড/এলাকা, থানা ও জেলার নামসহ।" };

  const district = findPlace(value, districts);
  if (!district) return {
    valid: false,
    error: "ঠিকানায় জেলার নামটি পাওয়া যায়নি। ঠিকানার শেষে থানা ও জেলার নাম যোগ করুন। উদাহরণ: House 34, Road 11, Sector 11, Uttara, Dhaka।",
  };

  const thana = findPlace(value, district.thanas) || (district.en === "Dhaka" && /\buttara\b|উত্তরা/iu.test(value) ? { en: "Uttara", bn: "উত্তরা" } : null);
  if (!thana) return {
    valid: false,
    error: `“${district.en}” জেলার সঠিক থানা/উপজেলার নামটি ঠিকানায় পাওয়া যায়নি। শেষে থানা ও জেলার নাম লিখুন। উদাহরণ: Olipur, Shayestaganj, ${district.en}।`,
  };
  return { valid: true, district: district.en, thana: thana.en, deliveryAddress: value };
}
