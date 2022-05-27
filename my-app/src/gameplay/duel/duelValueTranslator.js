import * as duelConstants from './duelGameConstants';

export function effectivenessScoreToText(val) {
    if (val == 0) { return duelConstants.typeEffectiveness.IMMUNE }
    else if (val == 0.5) { return duelConstants.typeEffectiveness.LOW_EFFECT }
    else if (val == 1) { return duelConstants.typeEffectiveness.MEDIUM_EFFECT }
    else if (val == 1.5) { return duelConstants.typeEffectiveness.HIGH_EFFECT }
    else if (val == 2) { return duelConstants.typeEffectiveness.SUPER_EFFECT }
    else { return "UNKNOWN"; }
}

export function effectivenessScoreToTextConversational(val) {
    if (val == 0) { return "Immune..." }
    else if (val == 0.5) { return "Barely Effective..." }
    else if (val == 1) { return "Somewhat Effective" }
    else if (val == 1.5) { return "Very Effective!" }
    else if (val == 2) { return "Super Effective!!" }
    else { return "UNKNOWN"; }
}