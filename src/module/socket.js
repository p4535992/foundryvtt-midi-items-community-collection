import { setSocket } from "../main";
import CONSTANTS from "./constants";
import { debug } from "./lib/lib";

export let communityMacrosSocket;

export function registerSocket() {
	debug("Registered communityMacrosSocket");
	if (communityMacrosSocket) {
		return communityMacrosSocket;
	}
	//@ts-ignore
	communityMacrosSocket = socketlib.registerModule(CONSTANTS.MODULE_NAME);
	setSocket(communityMacrosSocket);
	return communityMacrosSocket;
}
