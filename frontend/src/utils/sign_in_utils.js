import { calendarTypes } from "@/constants"
import store from "@/store"

let cachedPublicConfig = null

const getPublicConfig = async () => {
  if (cachedPublicConfig !== null) {
    return cachedPublicConfig
  }

  try {
    const response = await fetch("/api/public-config", {
      credentials: "same-origin",
    })

    if (!response.ok) {
      throw new Error(`Failed to load public config: ${response.status}`)
    }

    cachedPublicConfig = await response.json()
  } catch (error) {
    cachedPublicConfig = {}
  }

  return cachedPublicConfig
}

const getGoogleClientId = async () => {
  if (process.env.VUE_APP_GOOGLE_CLIENT_ID) {
    return process.env.VUE_APP_GOOGLE_CLIENT_ID
  }

  const config = await getPublicConfig()
  return config.googleClientId || ""
}

const getMicrosoftClientId = async () => {
  if (process.env.VUE_APP_MICROSOFT_CLIENT_ID) {
    return process.env.VUE_APP_MICROSOFT_CLIENT_ID
  }

  const config = await getPublicConfig()
  return config.microsoftClientId || ""
}

/** Redirects user to the correct google sign in page */
export const signInGoogle = async ({
  state = {},
  selectAccount = false,
  requestCalendarPermission = false,
  requestContactsPermission = false,
  loginHint = "",
}) => {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    window.alert("Google sign-in is not configured. Ask the server admin to set CLIENT_ID.")
    return
  }

  const redirectUri = `${window.location.origin}/auth`

  let scope = "openid email profile "
  if (requestCalendarPermission) {
    scope +=
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly "
  }
  if (requestContactsPermission) {
    scope +=
      "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/directory.readonly "
  }
  scope = encodeURIComponent(scope)

  let stateString = ""
  if (!state) state = {}
  state.calendarType = calendarTypes.GOOGLE
  state = encodeURIComponent(JSON.stringify(state))
  stateString = `&state=${state}`

  let promptString = ""
  if (selectAccount) {
    promptString = "&prompt=select_account+consent"
  } else {
    promptString = "&prompt=consent"
    if (loginHint.length > 0) {
      promptString += `&login_hint=${loginHint}`
    } else if (store.state.authUser) {
      promptString += `&login_hint=${store.state.authUser.email}`
    }
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline${promptString}${stateString}&include_granted_scopes=true`
  window.location.href = url
}

export const signInOutlook = async ({
  state = {},
  requestCalendarPermission = false,
}) => {
  const clientId = await getMicrosoftClientId()
  if (!clientId) {
    window.alert("Outlook sign-in is not configured. Ask the server admin to set MICROSOFT_CLIENT_ID.")
    return
  }

  const tenant = "common"
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth`)

  let scope = "offline_access User.Read"
  if (requestCalendarPermission) {
    scope += " Calendars.Read"
  }
  scope = encodeURIComponent(scope)

  let stateString = ""
  if (!state) state = {}
  state.calendarType = calendarTypes.OUTLOOK
  state.scope = scope
  state = encodeURIComponent(JSON.stringify(state))
  stateString = `&state=${state}`

  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}${stateString}`
  window.location.href = url
}
