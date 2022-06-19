import React from 'react';
import { Row, Col } from 'react-bootstrap';
import textFit from '../../../../utils/textFit';
import * as styleUtil from '../../../../utils/styleUtil';
import * as svgUtil from '../../../../utils/svgUtil';
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from 'recharts';
import * as gameConstants from '../../../../gameplay/duel/duelGameConstants';
import gsap from 'gsap';

const COLORS = ['#0088FE', '#00000000'];
const STROKES = ['black', '#00000000'];
class XalianPieceStateChart extends React.Component {

    buildBackgroundGradient = (color) => {
        let darkerColor = gsap.utils.interpolate(color, "black", 0.5);
        return `linear-gradient(0deg, ${darkerColor} 0%, ${color} 50%, ${darkerColor} 100%)`;
    }

    render() {
        var classes = this.props.classes || 'duel-state-chart-wrapper-position';
        var wrapperClasses = this.props.wrapperClasses || 'duel-status-bar-wrapper';
        var spacing = this.props.spacing || '0px';
        var barHeight = this.props.barHeight || '2px';

        let xalianState = this.props.xalianState;

        var healthBarPercentage = (xalianState.health / gameConstants.MAX_HEALTH_POINTS) * 100;
        healthBarPercentage = healthBarPercentage < 5 ? 5 : healthBarPercentage;
        let healthBarColor = healthBarPercentage > 50 ? 'green' : healthBarPercentage > 25 ? 'orange' : 'red';
        let healthBarLighterColor = healthBarPercentage > 50 ? '#00cc00' : healthBarPercentage > 25 ? '#ffbf00' : '#ff0000';

        var staminaBarPercentage = (xalianState.stamina / gameConstants.MAX_STAMINA_POINTS) * 100;
        staminaBarPercentage = staminaBarPercentage < 5 ? 5 : staminaBarPercentage;

        var style = {
            height: barHeight, 
            pointerEvents: 'none',
            marginTop: '2px',
            marginBottom: '2px'
        }
        
        return (
            <div className={classes} style={{ height: 'auto', minWidth: '25px', pointerEvents: 'none', width: '100%', zIndex: '104' }}>
                <div className={wrapperClasses} style={{display: 'flex', flexDirection: 'column', filter: 'drop-shadow(0px 0px 2px #000000)' }}>
                    <div style={{ width: '100%', height: '100%', filter: 'drop-shadow(0px 0px 1px #000000) drop-shadow(0px 0px 2px #000000)', border: `1px outset ${healthBarColor}`, borderRadius: '4px'}}>
                        <div style={{ ...style, width: `${healthBarPercentage}%`, background: this.buildBackgroundGradient(healthBarLighterColor), pointerEvents: 'none', boxShadow: `0px 0px 1px 1px ${healthBarColor}`, borderRadius: '4px' }} />
                    </div>
                    <div style={{ width: '100%', height: '100%', filter: 'drop-shadow(0px 0px 1px #000000) drop-shadow(0px 0px 2px #000000)', border: `1px outset #4d4bc2`, borderRadius: '4px', marginTop: spacing}}>
                        <div style={{ ...style, width: `${staminaBarPercentage}%`, background: this.buildBackgroundGradient('#6d8ed9'), pointerEvents: 'none', boxShadow: `0px 0px 1px 1px #4d4bc2`, borderRadius: '4px' }}  />
                    </div>
                </div>
            </div>
        );
    }
}

export default XalianPieceStateChart;
