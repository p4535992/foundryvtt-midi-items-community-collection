import { setSocket } from "../maint";
import { debug } from "./lib/lib";

export let midiItemsCommunitySocket;

export function registerSocket() {
	debug("Registered midiItemsCommunitySocket");
	if (midiItemsCommunitySocket) {
		return midiItemsCommunitySocket;
	}
	//@ts-ignore
	midiItemsCommunitySocket = socketlib.registerModule(CONSTANTS.MODULE_NAME);
	setSocket(midiItemsCommunitySocket);
	return midiItemsCommunitySocket;
}
