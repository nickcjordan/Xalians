import React, { useState, useEffect } from 'react';
import * as timerUtil from '../../../utils/timerUtil';

const Timer = () => {
	const [millis, setMillis] = useState(0);
	const [currentStartTime, setCurrentStartTime] = useState(0);
	const [isActive, setIsActive] = useState(false);
	const [totalTime, setTotalTime] = useState(0);

	function toggle() {
		if (isActive) {
			pauseTimer();
		} else {
			startTimer();
		}
		setIsActive(!isActive);
	}

	function reset() {
		setMillis(0);
		setCurrentStartTime(0);
		setIsActive(false);
		setTotalTime(0);
	}

	useEffect(() => {
		let interval = null;
		if (isActive) {
			interval = setInterval(() => {
				setMillis(() => elapsedTime());
			}, 100);
			// } else if (!isActive && millis !== 0) {
		} else if (!isActive) {
			clearInterval(interval);
		}
		return () => clearInterval(interval);
	}, [isActive, millis]);

	function startTimer() {
		let startTime = performance.now();
		setCurrentStartTime(startTime);
	}

	function elapsedTime() {
		return isActive ? convertMillisToSeconds(getTotalTimeDiff()) : 0;
	}

	function getTotalTimeDiff() {
		let endTime = performance.now();
		var timeDiff = endTime - currentStartTime;
        timeDiff += totalTime;
		return timeDiff;
	}

	function pauseTimer() {
		let endTime = performance.now();
		var timeDiff = endTime - currentStartTime;
		setCurrentStartTime(0);
        setTotalTime(totalTime + timeDiff);
	}

	function convertMillisToSeconds(ms) {
		return Math.round((ms / 1000) * 100) / 100;
	}

	return (
		<div className="app">
			<div className="time">{millis}s</div>
			<div className="row">
				<button className={`button button-primary button-primary-${isActive ? 'active' : 'inactive'}`} onClick={toggle}>
					{isActive ? 'Pause' : 'Start'}
				</button>
				<button className="button" onClick={reset}>
					Reset
				</button>
			</div>
		</div>
	);
};

export default Timer;
