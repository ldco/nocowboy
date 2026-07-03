import { NOCOWBOY_API_BASE, NOCOWBOY_OPENROUTER_BASE } from "./constants"
import { getNoCowboyUrlFromToken } from "../auth/token"

const GATEWAY_PATH = "/api/gateway/"
const OPENROUTER_PATH = "/api/openrouter/"

function resolveRouteBase(url: string, targetPath: string): string {
  const parsed = new URL(url)
  const apiIndex = parsed.pathname.indexOf("/api/")
  if (apiIndex >= 0) {
    parsed.pathname = parsed.pathname.substring(0, apiIndex) + targetPath
  } else {
    parsed.pathname = targetPath
  }
  parsed.search = ""
  parsed.hash = ""
  return parsed.toString()
}

export function resolveNoCowboyGatewayBaseUrl(opts?: { baseURL?: string; token?: string }): string {
  if (opts?.token) {
    const tokenUrl = getNoCowboyUrlFromToken(opts.token)
    if (tokenUrl) return resolveRouteBase(tokenUrl, GATEWAY_PATH)
  }
  const base = opts?.baseURL || NOCOWBOY_API_BASE
  return resolveRouteBase(base, GATEWAY_PATH)
}

export function resolveNoCowboyOpenRouterBaseUrl(opts?: { baseURL?: string; token?: string }): string {
  if (opts?.token) {
    const tokenUrl = getNoCowboyUrlFromToken(opts.token)
    if (tokenUrl) return resolveRouteBase(tokenUrl, OPENROUTER_PATH)
  }
  const base = opts?.baseURL || NOCOWBOY_API_BASE
  return resolveRouteBase(base, OPENROUTER_PATH)
}
