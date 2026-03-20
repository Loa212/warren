// @warren/sdk — programmatic TypeScript API for Warren

// Re-export shared types from @warren/types
// Re-export WsMessage for advanced usage
export type {
  EncryptedPayload,
  PairedDevice,
  TerminalSession,
  WarrenConfig,
  WsMessage,
} from '@warren/types'
// Crypto utilities for advanced usage (pairing flows)
export { deriveSharedSecret, generateKeyPair } from './crypto'
export { Emitter } from './emitter'
export { WarrenHttp } from './http'
export { Session } from './session'
// Re-export SDK types
export type {
  ConfigResponse,
  CreateSessionOptions,
  DeviceInfo,
  DiscoverNode,
  HealthResponse,
  PairStartResponse,
  SessionEvents,
  WarrenEvents,
  WarrenOptions,
} from './types'
export { Warren } from './warren'
export { WarrenWs } from './ws'
