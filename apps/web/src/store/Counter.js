import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { decrement, increment } from './counterSlice'
import { addAnimationToQueue } from './duelAnimationQueueSlice';


export function Counter() {
  const count = useSelector(state => state.duelAnimationQueue.queue);
  const json = JSON.stringify(count);
  const dispatch = useDispatch();

  return (
      <div>
        <button
          aria-label="Increment value"
          onClick={() => dispatch(addAnimationToQueue("hi"))}
        >
          Increment
        </button>
        <span>{json}</span>
        <button
          aria-label="Decrement value"
          onClick={() => dispatch(decrement())}
        >
          Decrement
        </button>
        <p>
            {count}
      </p>
    </div>
  )
}