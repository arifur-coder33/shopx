export const trackFacebookEvent = (eventName, params = {}) => {
  if (typeof fbq === "function") {
    fbq("track", eventName, params);
  }
};
