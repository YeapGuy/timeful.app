import posthog from "posthog-js"

export default {
  install(Vue, options) {
    const apiKey = process.env.VUE_APP_POSTHOG_API_KEY
    if (!apiKey) {
      Vue.prototype.$posthog = null
      return
    }

    Vue.prototype.$posthog = posthog.init(apiKey, {
      api_host: "https://e.timeful.app",
      capture_pageview: false,
      autocapture: false,
    })
  },
}
