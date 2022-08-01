import API from "./api";
import { registerSocket } from "./socket";


export const initHooks = (): void => {
  // registerSettings();
  //registerLibwrappers();
  //new HandlebarHelpers().registerHelpers();

  Hooks.once('socketlib.ready', registerSocket);

};

export const setupHooks = (): void => {
  // // setup all the hooks
  // API.effectInterface = new EffectInterface(CONSTANTS.MODULE_NAME) as unknown as typeof EffectInterface;
  // //@ts-ignore
  // API.effectInterface.initialize();

  //@ts-ignore
  setApi(API);
};

export const readyHooks = (): void => {
  //checkSystem();
  //registerHotkeys();
  //Hooks.callAll(HOOKS.READY);

};
