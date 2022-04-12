import { Hub } from 'aws-amplify';

Hub.listen('game-timer', (data) => {
	const type = data.payload.event;
	const req = data.payload.data;
	if (type === 'start-timer') {
	} else if (type === 'stop-timer') {
		this.setState({ isShowing: false });
	} else if (type === 'show-alert') {
		this.setState({ isShowing: true });
	}
});

// export const start = () => {
//     let startTime = performance.now();
//     setCurrentStartTime(startTime);
//     return startTime;
// }

// export const elapsedTime = () => {
//     return convertMillisToSeconds(performance.now() - currentStartTime);
// }

// export const stop = () => {
//     let endTime = performance.now();
//     var timeDiff = endTime - currentStartTime;
//     timeSections.forEach(section => {
//         timeDiff += section;
//     });
//     setTimeSections([]);
//     setCurrentStartTime(0);
//     return convertMillisToSeconds(timeDiff);
// }

// export const pause = () => {
//     let endTime = performance.now();
//     var timeDiff = endTime - currentStartTime;
//     setCurrentStartTime(0);
//     let sections = timeSections;
//     sections.push(timeDiff);
//     setTimeSections(sections);
//     return convertMillisToSeconds(timeDiff);
// }


// export const convertMillisToSeconds = (ms) => {
//     return Math.round(ms / 1000 * 100)/100;
// }

