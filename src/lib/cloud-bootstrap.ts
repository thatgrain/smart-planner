import type { PlannerState } from './domain/types'

export type BootstrapDecision =
  | 'use-cloud'
  | 'upload-local'
  | 'create-initial'
  | 'conflict'

/**
 * Decides what to do the first time a browser connects to the cloud, or when
 * the cloud row is missing.
 */
export function decideBootstrap(input: {
  hasLocal: boolean
  hasRemote: boolean
  linked: boolean
  local: PlannerState
  remote: PlannerState | null
}): BootstrapDecision {
  const { hasLocal, hasRemote, linked, local, remote } = input

  if (linked) {
    if (hasRemote) return 'use-cloud'
    return hasLocal ? 'upload-local' : 'create-initial'
  }

  if (hasRemote && hasLocal) {
    return remote && JSON.stringify(local) === JSON.stringify(remote)
      ? 'use-cloud'
      : 'conflict'
  }

  if (hasRemote) return 'use-cloud'
  if (hasLocal) return 'upload-local'
  return 'create-initial'
}
