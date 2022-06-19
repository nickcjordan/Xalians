

export function buildXalianState(xalian) {
    return {
        xalianId: xalian.xalianId,
        health: xalian.state.health
    }
}

export function buildXalianStates(xalians) {
    let states = [];
    xalians.forEach(xalian => {
        states.push(buildXalianState(xalian));
    })
    return states;
}