import API from "./api.js";
import { registerSocket } from "./socket.js";
export const initHooks = () => {
    // registerSettings();
    //registerLibwrappers();
    //new HandlebarHelpers().registerHelpers();
    Hooks.once("socketlib.ready", registerSocket);
};

export const setupHooks = () => {
    setApi(API);
};

export const readyHooks = () => {
    //checkSystem();
    //registerHotkeys();
    //Hooks.callAll(HOOKS.READY);
};
