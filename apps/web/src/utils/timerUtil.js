// timer Hub wiring removed — was module-level Hub.listen with this.setState (broken); re-add inside a component if ever needed

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
