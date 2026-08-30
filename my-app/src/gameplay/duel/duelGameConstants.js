export const BOARD_COLUMN_SIZE = 8;
export const MAX_HEALTH_POINTS = 15;
export const MAX_STAMINA_POINTS = 6;
export const MAX_SPACES_MOVED_PER_TURN = 3;
export const XALIANS_PER_TEAM = 6;
// export const ATTACK_STAMINA_COST = MAX_STAMINA_POINTS / 2;

// evasion is a flat damage reduction rather than a dodge chance - a whiffed attack
// costs a whole turn's single attack, which feels worse than a smaller hit.
// piece evasion runs 2 (very low) to 10 (very high).
export const EVASION_DAMAGE_REDUCTION_PER_POINT = 0.02;
export const MAX_EVASION_DAMAGE_REDUCTION = 0.25;

// carrying a flag slows a piece down, so a fast grab still has to survive the walk home
export const FLAG_CARRIER_MAX_SPACES_PER_TURN = 2;

export const actionTypes = {
    MOVE: 'move',
    ATTACK: 'attack',
    COMBO: 'combo'
}

export const typeEffectiveness = {
    IMMUNE: 'Immune',
    LOW_EFFECT: 'Weak',
    MEDIUM_EFFECT: 'Average',
    HIGH_EFFECT: 'Good',
    SUPER_EFFECT: 'Strong'
}

export const PLAYER_ONE_COLOR = '#3bbedf';
export const PLAYER_ONE_COLOR_NO_ALPHA = PLAYER_ONE_COLOR + '00';
export const PLAYER_TWO_COLOR = '#C39738';
export const PLAYER_TWO_COLOR_NO_ALPHA = PLAYER_TWO_COLOR + '00';