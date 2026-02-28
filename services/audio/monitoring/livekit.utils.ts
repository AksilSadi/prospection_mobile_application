import { Room, createLocalAudioTrack } from "livekit-client";
import { AudioEventLogger } from "../audio.logger";
import type { TokenResponse } from "./monitoring.types";

export class LiveKitUtils {
  static async connectAsCommercial(details: TokenResponse): Promise<Room> {
    const room = new Room();
    await room.connect(details.serverUrl, details.participantToken);

    const audioTrack = await createLocalAudioTrack({
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: true,
    });

    await room.localParticipant.publishTrack(audioTrack, { audioBitrate: 64_000 });
    AudioEventLogger.logMicrophoneUnmuted("Track audio publie", `room=${details.roomName}`);

    room.on("disconnected", reason => {
      AudioEventLogger.logConnectionError("LiveKit disconnected", String(reason || ""));
    });

    return room;
  }

  static async disconnect(room?: Room | null): Promise<void> {
    if (room) {
      await room.disconnect();
    }
  }
}
