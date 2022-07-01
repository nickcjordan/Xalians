export const BOARD_COLUMN_SIZE = 8;
export const MAX_HEALTH_POINTS = 10;
export const MAX_STAMINA_POINTS = 6;
export const MAX_SPACES_MOVED_PER_TURN = 3;
export const XALIANS_PER_TEAM = 6;
// export const ATTACK_STAMINA_COST = MAX_STAMINA_POINTS / 2;

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