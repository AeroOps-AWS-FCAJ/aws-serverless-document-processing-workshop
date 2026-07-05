import { normalizeCurrencyCode, supportedCurrencies } from "@/lib/docuflow-data"

export const DEFAULT_REPORTING_CURRENCY = "VND"

const supportedCurrencyCodes = new Set<string>(
  supportedCurrencies.map(({ code }) => code),
)

export function userProfilePreferencesStorageKey(userId?: string) {
  return `docuflow:user-profile-preferences:${userId || "anonymous"}`
}

export function getUserDefaultCurrency(userId?: string) {
  if (typeof window === "undefined") return DEFAULT_REPORTING_CURRENCY

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(userProfilePreferencesStorageKey(userId)) || "{}",
    ) as { defaultCurrency?: unknown }
    const currency = normalizeCurrencyCode(stored.defaultCurrency, DEFAULT_REPORTING_CURRENCY)

    return supportedCurrencyCodes.has(currency)
      ? currency
      : DEFAULT_REPORTING_CURRENCY
  } catch {
    return DEFAULT_REPORTING_CURRENCY
  }
}
