
import { Hub } from "aws-amplify";
import { v4 as uuidv4 } from 'uuid';
import * as boardStateManager from './boardStateManager';
import * as duelConstants from './duelGameConstants';

export const actionPlugin = {

  // Required.
  name: 'action-plugin',

  // Initialize the plugin's data.
  // This is stored in a special area of the state object
  // and not exposed to the move functions.
  // setup: ({ G, ctx, game }) => data object,

  // Create an object that becomes available in `ctx`
  // under `ctx['plugin-name']`.
  // This is called at the beginning of a move or event.
  // This object will be held in memory until flush (below)
  // is called.35
  // api: ({ G, ctx, game, data, playerID }) => {
  //     return {
  //         message: 'huh'
  //     }
  // },

  // Return an updated version of data that is persisted
  // in the game's state object.
  // flush: ({ G, ctx, game, data, api }) => {
  //     return {
  //         apiObj: api,
  //         dataObj: data
  //     }
  // },

  // Function that accepts a move / trigger function
  // and returns another function that wraps it. This
  // wrapper can modify G before passing it down to
  // the wrapped function. It is a good practice to
  // undo the change at the end of the call.
  fnWrap: (fn) => (G, ctx, ...args) => {
    G = preprocess(G, ctx, args);
    G = fn(G, ctx, ...args);
    G = postprocess(G, ctx);

    return G;
  },

  // Function that allows the plugin to indicate that it
  // should not be run on the client. If it returns true,
  // the client will discard the state update and wait
  // for the master instead.
  // noClient: ({ G, ctx, game, data, api }) => boolean,

  // Function that allows the plugin to indicate that the
  // current action should be declared invalid and cancelled.
  // If `isInvalid` returns an error message, the whole update
  // will be abandoned and an error returned to the client.
  // isInvalid: ({ G, ctx, game, data, api }) => false | string,

  // Function that can filter `data` to hide secret state
  // before sending it to a specific client.
  // `playerID` could also be null or undefined for spectators.
  // playerView: ({ G, ctx, game, data, playerID }) => filtered data object,
}

function preprocess(G, ctx, args) {
  let startState = boardStateManager.buildBoardState(G, ctx);
  
  let moveId = uuidv4();
  return { 
    ...G, 
    moveId: moveId,
    startState: {...startState, moveId: moveId }
  };
}

function postprocess(G, ctx) {

  // let actionMeta = {
  //   moveId: G.moveId,
  //   startState: G.startState
  // }; 

  let actionMeta = {
    moveId: G.moveId
  }; 

  // grab attack result from currentTurnActions so it will be available in action meta
  let lastAction = G.currentTurnActions[G.currentTurnActions.length - 1];
  if (lastAction && (lastAction.type == duelConstants.actionTypes.ATTACK) && lastAction.attack.result) {
    actionMeta.attackActionResult = lastAction.attack.result;
  }

  // add current state index to meta
  actionMeta.boardStateIndex = G.boardStateHistory ? G.boardStateHistory.length : 0;;

  // add post-move-G-state to history 
  let history = G.boardStateHistory ? [...G.boardStateHistory] : [];
  history.push(G.startState);

  // set this moves log meta
  ctx.log.setMetadata(actionMeta);

  return {
    ...G, 
    startState: null,
    boardStateHistory: history
  };
}