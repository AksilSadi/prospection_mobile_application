import { audioApi } from "@/services/api/audio/audio.service";

export class AudioEventLogger {
  static async logEvent(eventType: string, message: string, details?: string) {
    return audioApi.logAudioEvent(eventType, message, details);
  }

  static logMicrophoneMuted(message: string, details?: string) {
    return this.logEvent("MICROPHONE_MUTED", message, details);
  }

  static logMicrophoneUnmuted(message: string, details?: string) {
    return this.logEvent("MICROPHONE_UNMUTED", message, details);
  }

  static logMicrophoneEnded(message: string, details?: string) {
    return this.logEvent("MICROPHONE_ENDED", message, details);
  }

  static logTrackUnpublished(message: string, details?: string) {
    return this.logEvent("TRACK_UNPUBLISHED", message, details);
  }

  static logConnectionError(message: string, details?: string) {
    return this.logEvent("CONNECTION_ERROR", message, details);
  }

  static logWebSocketFailed(message: string, details?: string) {
    return this.logEvent("WEBSOCKET_FAILED", message, details);
  }
}
