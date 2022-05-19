import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './counterSlice';
import duelAnimationQueueReducer from './duelAnimationQueueSlice';

export default configureStore({
    reducer: {
        duelAnimationQueue: duelAnimationQueueReducer
    }
  })