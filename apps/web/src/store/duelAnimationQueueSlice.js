import { createSlice } from '@reduxjs/toolkit'

export const duelAnimationQueueSlice = createSlice({
  name: 'duelAnimationQueue',
  initialState: {
    queue: []
  },
  reducers: {
    addAnimationToQueue:  (state, log) => {
        state.queue.splice(0, 0, log.payload);
        console.log("SLICIN");
    },
    popAnimationOffQueue:  (state, log) => {
      let popped = state.queue.pop();
      console.log("POPPED");
      // return popped;
  }
  }
})

// Action creators are generated for each case reducer function
export const { addAnimationToQueue, popAnimationOffQueue } = duelAnimationQueueSlice.actions

export default duelAnimationQueueSlice.reducer